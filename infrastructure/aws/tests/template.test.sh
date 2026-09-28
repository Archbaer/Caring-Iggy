#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)
template="$repo_root/infrastructure/aws/template.yml"

[[ -f "$template" ]] || {
    echo "CloudFormation template is missing" >&2
    exit 1
}

command -v cfn-lint >/dev/null 2>&1 || {
    echo "cfn-lint is required" >&2
    exit 1
}
cfn-lint "$template"

python3 - "$template" <<'PY'
import pathlib
import sys

import yaml

template_path = pathlib.Path(sys.argv[1])
document = yaml.safe_load(template_path.read_text())
resources = document["Resources"]

def resources_of_type(resource_type):
    return [value for value in resources.values() if value.get("Type") == resource_type]

def require(condition, message):
    if not condition:
        raise AssertionError(message)

require("ImageOwner" not in document.get("Parameters", {}), "image owner is deployment state")
require("ImageTag" not in document.get("Parameters", {}), "image tag is deployment state")

vpcs = resources_of_type("AWS::EC2::VPC")
public_subnets = [r for r in resources_of_type("AWS::EC2::Subnet") if r["Properties"].get("MapPublicIpOnLaunch")]
private_subnets = [r for r in resources_of_type("AWS::EC2::Subnet") if not r["Properties"].get("MapPublicIpOnLaunch", False)]
require(len(vpcs) == 1, "exactly one VPC is required")
require(len(public_subnets) == 1, "exactly one public subnet is required")
require(len(private_subnets) == 2, "exactly two private DB subnets are required")
require(private_subnets[0]["Properties"]["AvailabilityZone"] != private_subnets[1]["Properties"]["AvailabilityZone"], "DB subnets must use different AZ selectors")
require(not resources_of_type("AWS::EC2::NatGateway"), "NAT Gateway is out of scope")
associations = resources_of_type("AWS::EC2::SubnetRouteTableAssociation")
require(len(associations) == 1 and associations[0]["Properties"]["SubnetId"] == {"Ref": "PublicSubnet"}, "only the public subnet may receive the internet route table")

ec2_sg = resources["ApplicationSecurityGroup"]
ingress = ec2_sg["Properties"]["SecurityGroupIngress"]
require(sorted(rule["FromPort"] for rule in ingress) == [80, 443], "EC2 ingress must be only 80/443")
require(all(rule["IpProtocol"] == "tcp" and rule["FromPort"] == rule["ToPort"] for rule in ingress), "EC2 ingress must be exact TCP ports")
require(all(rule.get("CidrIp") == "0.0.0.0/0" for rule in ingress), "public web ingress must be IPv4 internet")
require(all(rule.get("FromPort") != 22 for group in resources_of_type("AWS::EC2::SecurityGroup") for rule in group["Properties"].get("SecurityGroupIngress", [])), "SSH must not be public")

rds_ingress = resources["DatabaseSecurityGroupIngress"]["Properties"]
require(rds_ingress["IpProtocol"] == "tcp" and rds_ingress["FromPort"] == 5432 and rds_ingress["ToPort"] == 5432, "RDS ingress must be PostgreSQL only")
require(rds_ingress["SourceSecurityGroupId"] == {"Fn::GetAtt": ["ApplicationSecurityGroup", "GroupId"]}, "RDS ingress must originate from EC2 SG")

database = resources["Database"]
db = database["Properties"]
require(db["Engine"] == "postgres" and str(db["EngineVersion"]).split(".")[0] == "15", "RDS must use PostgreSQL 15")
require(db["DBInstanceClass"] == "db.t4g.small", "RDS class must remain small")
require(db["AllocatedStorage"] == 20 and db["StorageType"] == "gp3" and db["StorageEncrypted"] is True, "RDS storage contract failed")
require(db["PubliclyAccessible"] is False and db["MultiAZ"] is False, "RDS must be private Single-AZ")
require(db["BackupRetentionPeriod"] == 7, "RDS PITR retention must be seven days")
require(db["ManageMasterUserPassword"] is True, "RDS master secret must be managed")
require(database["DeletionPolicy"] == "Snapshot" and database["UpdateReplacePolicy"] == "Snapshot", "RDS snapshot policies are required")
require(document["Parameters"]["EnableRdsDeletionProtection"]["Default"] == "true", "RDS deletion protection must default on")
require(db["DeletionProtection"] == {"Ref": "EnableRdsDeletionProtection"}, "RDS deletion protection must be explicitly controllable for decommission")

instance = resources["ApplicationInstance"]["Properties"]
require(instance["InstanceType"] == "t3.medium", "EC2 must use t3.medium")
require(instance["MetadataOptions"]["HttpTokens"] == "required", "IMDSv2 is required")
root = instance["BlockDeviceMappings"][0]["Ebs"]
require(root["VolumeSize"] == 40 and root["VolumeType"] == "gp3" and root["Encrypted"] is True, "EC2 root volume contract failed")
require("KeyName" not in instance, "SSH key pairs are forbidden")
user_data = instance["UserData"]["Fn::Base64"]
require("docker-compose-linux-x86_64" in user_data and "sha256sum --check --strict" in user_data, "Compose install must be pinned and verified")
require(all(name not in user_data for name in ("prepare-runtime.sh", "start-stack.sh", "docker-compose.prod.yml", "caring-iggy.service")), "user data must not embed versioned runtime files")

bucket = resources["ArtifactBucket"]["Properties"]
public_block = bucket["PublicAccessBlockConfiguration"]
require(all(public_block[key] is True for key in ("BlockPublicAcls", "BlockPublicPolicy", "IgnorePublicAcls", "RestrictPublicBuckets")), "S3 public access must be fully blocked")
require(bucket["BucketEncryption"]["ServerSideEncryptionConfiguration"][0]["ServerSideEncryptionByDefault"]["SSEAlgorithm"] == "AES256", "S3 SSE-S3 is required")
require(bucket["OwnershipControls"]["Rules"][0]["ObjectOwnership"] == "BucketOwnerEnforced", "S3 ACLs must be disabled")
require(bucket["LifecycleConfiguration"]["Rules"][0]["ExpirationInDays"] == 1, "artifacts must expire after one day")

statements = resources["ApplicationRole"]["Properties"]["Policies"][0]["PolicyDocument"]["Statement"]
s3_statements = [statement for statement in statements if statement["Action"] == "s3:GetObject"]
require(len(s3_statements) == 1, "exactly one S3 read grant is required")
require(s3_statements[0]["Resource"] == {"Fn::Sub": "${ArtifactBucket.Arn}/deployments/*"}, "S3 read must be scoped to deployment objects")
require(all("s3:*" not in ([s["Action"]] if isinstance(s["Action"], str) else s["Action"]) for s in statements), "wildcard S3 permission is forbidden")
secret_statement = next(statement for statement in statements if statement["Action"] == "secretsmanager:GetSecretValue")
require(secret_statement["Resource"] == [{"Ref": "ApplicationSecret"}, {"Fn::GetAtt": ["Database", "MasterUserSecret.SecretArn"]}], "secret reads must be limited to both stack secrets")

outputs = document["Outputs"]
for output in ("InstanceId", "ElasticIp", "RdsEndpoint", "AppSecretArn", "RdsSecretArn", "ArtifactBucketName", "InstanceProfileArn", "StackName"):
    require(output in outputs, f"missing output: {output}")
PY

echo "CloudFormation template contract: PASS"
