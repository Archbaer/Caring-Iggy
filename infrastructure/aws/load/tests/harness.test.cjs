#!/usr/bin/env -S node --
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const loadDir = path.resolve(__dirname, '..');
const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

// Doubles replace remote AWS/HTTP/Docker boundaries; real scripts run unchanged.
if (['aws', 'curl', 'docker'].includes(path.basename(process.argv[1]))) {
  const args = process.argv.slice(2);
  const stateFile = process.env.TEST_STATE;
  const state = JSON.parse(fs.readFileSync(stateFile));
  const save = () => fs.writeFileSync(stateFile, JSON.stringify(state));
  const fail = message => { console.error(message); process.exit(1); };
  if (args.some(arg => /secret-password|session-secret|csrf-secret/.test(arg))) fail('secret in argv');
  const tool = path.basename(process.argv[1]);
  if (tool === 'aws') {
    if (args[0] === 'cloudformation') {
      state.tagChecks = (state.tagChecks || 0) + 1; save();
      if (args.includes('--query')) {
        const query = args[args.indexOf('--query') + 1];
        console.log(query.includes('Purpose') ? state.purpose : query.includes('AppSecretArn') ? 'arn:test:secret' : query.includes('InstanceId') ? 'i-1234567890abcdef0' : 'db.test.internal');
      } else console.log(JSON.stringify({ Stacks: [{ StackId: state.replaceOnRecheck && state.tagChecks>=3 ? 'arn:test:replacement' : 'arn:test:stack', Tags: [{Key:'Purpose',Value:state.purpose}], Outputs: [{OutputKey:'AppSecretArn',OutputValue:'arn:test:secret'},{OutputKey:'InstanceId',OutputValue:'i-1234567890abcdef0'},{OutputKey:'RdsEndpoint',OutputValue:'db.test.internal'}]}] }));
    } else if (args[0] === 'secretsmanager') {
      console.log(JSON.stringify({initialAdmin:{email:'operator@example.test',passwordHex:'secret-password"\\quoted'}}));
    } else if (args[1] === 'send-command') {
      const parameters = args[args.indexOf('--parameters') + 1];
      const content = parameters.startsWith('file://') ? fs.readFileSync(parameters.slice(7),'utf8') : parameters;
      const command = JSON.parse(content).commands.join('\n');
      assert.match(command, /DELETE FROM accounts/);
      assert.match(command, /DELETE FROM adopters/);
      assert.match(command, /profile_type/);
      assert.match(command, /email/);
      assert.match(command, /--env-file/);
      state.remoteCleanup = true; save();
      console.log(JSON.stringify({Command:{CommandId:'test-command'}}));
    } else if (args[1] === 'get-command-invocation') {
      if (state.ssmFail) console.log(JSON.stringify({Status:'Failed',StandardErrorContent:'secret-password'}));
      else {
        state.records = state.records.filter(r => !['ADOPTER','STAFF_ACCOUNT'].includes(r.type)); save();
        console.log(JSON.stringify({Status:'Success'}));
      }
    } else fail('unexpected AWS call');
  } else if (tool === 'docker') {
    if (process.env.TEST_REMOTE === 'true') {
      const sql = fs.readFileSync(0,'utf8');
      assert(args.includes('--env-file'));
      assert(args.includes('caring-iggy_backend'));
      assert(!args.some(arg=>arg.startsWith('PGPASSWORD=')));
      state.sqlCalls=(state.sqlCalls||0)+1;
      if (sql.includes('SELECT profile_id')) {
        assert.match(sql,/email = 'load-123-0123456789abcdef-adopter@example.org'/);
        assert.match(sql,/role = 'ADOPTER' AND profile_type = 'ADOPTER'/);
        assert.match(sql,/id = NULLIF\('00000000-0000-4000-8000-000000000001'/);
        if(state.records.some(r=>r.type==='ADOPTER')) console.log(uuid(2));
      } else if (sql.includes('DELETE FROM adopters')) {
        assert.match(sql,/WHERE id = '00000000-0000-4000-8000-000000000002'::uuid AND email = 'load-123-0123456789abcdef-adopter@example.org'/);
        state.profileDeleted=true;
      } else if (sql.includes('DELETE FROM accounts')) {
        assert(state.profileDeleted || !state.records.some(r=>r.type==='ADOPTER'));
        assert.match(sql,/role = 'STAFF' AND profile_type = 'EMPLOYEE'/);
        assert.match(sql,/NOT EXISTS \(SELECT 1 FROM employees WHERE employees.id = accounts.profile_id\)/);
        assert.match(sql,/SELECT 1 \/ CASE WHEN EXISTS/);
        state.records=state.records.filter(r=>!['ADOPTER','STAFF_ACCOUNT'].includes(r.type));
      } else fail('unexpected SQL');
      save();process.exit(0);
    }
    assert(args.includes('--network') && args.includes('host'));
    assert(args.some(arg => /^grafana\/k6:(?:\d+\.){2}\d+@sha256:[a-f0-9]{64}$/.test(arg)));
    state.docker = true; save(); process.exit(state.dockerFail ? 7 : 0);
  } else {
    let method = 'GET', url, body, jar, config = '';
    for (let i=0;i<args.length;i++) {
      if (args[i]==='--config' || args[i]==='-K') config = fs.readFileSync(args[++i],'utf8');
      else if (args[i]==='-X' || args[i]==='--request') method = args[++i];
      else if (args[i]==='--data-binary' || args[i]==='-d') {const data=args[++i];body=data.startsWith('@') ? fs.readFileSync(data.slice(1),'utf8') : data;}
      else if (args[i]==='-b' || args[i]==='--cookie') jar=args[++i];
      else if (/^https:\/\//.test(args[i])) url=args[i];
    }
    if (config) {
      method = config.match(/^request = "(.*)"$/m)?.[1] || method;
      url = config.match(/^url = "(.*)"$/m)?.[1] || url;
      jar = config.match(/^cookie = "(.*)"$/m)?.[1] || jar;
      const data = config.match(/^data-binary = "@(.*)"$/m)?.[1];
      if (data) body=fs.readFileSync(data,'utf8');
    }
    const endpoint = new URL(url).pathname;
    if (method !== 'GET') {
      assert.match(config || args.join('\n'), /[Oo]rigin: https:\/\/fixture.test/,'mutations require trusted Origin');
      assert.match(config || args.join('\n'), /x-csrf-token/);
    }
    const outputArg = args.indexOf('--output') >= 0 ? args[args.indexOf('--output')+1] : args.indexOf('-o') >= 0 ? args[args.indexOf('-o')+1] : config.match(/^output = "(.*)"$/m)?.[1];
    const emit = (payload,status=200) => {const text=JSON.stringify(payload);if(outputArg) fs.writeFileSync(outputArg,text);else process.stdout.write(text);if(args.includes('--write-out')) process.stdout.write(String(status));};
    const cookies = config.match(/^cookie-jar = "(.*)"$/m)?.[1] || (args.includes('-c') ? args[args.indexOf('-c')+1] : null);
    if (cookies) fs.writeFileSync(cookies, '# Netscape HTTP Cookie File\nfixture.test\tFALSE\t/\tTRUE\t0\tci_session\tsession-secret\nfixture.test\tFALSE\t/\tTRUE\t0\tci_session_state\tstate-secret\nfixture.test\tFALSE\t/\tTRUE\t0\tci_csrf\tcsrf-secret\n');
    if (endpoint==='/api/auth/session') emit({csrfToken:'csrf-secret'});
    else if (endpoint==='/api/auth/login') {
      assert.equal(JSON.parse(body).password,'secret-password"\\quoted');state.adminSessions=(state.adminSessions||0)+1;save();emit({user:{role:'ADMIN'},csrfToken:'csrf-secret'});
    } else if(endpoint==='/api/auth/logout') {
      state.adminSessions--;save();emit({ok:true,csrfToken:'csrf-secret'});
    } else if (endpoint==='/api/auth/signup') {
      const data=JSON.parse(body); assert.equal(data.telephone,'07000000000');
      state.records.push({type:'ADOPTER',email:data.email,id:uuid(1),profileId:uuid(2)});save(); emit({user:{accountId:uuid(1),profileId:uuid(2),role:'ADOPTER'},csrfToken:'csrf-secret'},201);
    } else if (endpoint==='/api/admin/staff' && method==='POST') {
      if(state.failStaff) {save();process.exit(22);}
      assert(jar && fs.readFileSync(jar,'utf8').includes('ci_session_state'));
      const data=JSON.parse(body);assert.equal(data.role,'STAFF');
      state.records.push({type:'STAFF',id:uuid(3)},{type:'STAFF_ACCOUNT',email:data.email,id:uuid(4),profileId:uuid(3)});save();emit({role:'STAFF',profileId:uuid(3),accountId:uuid(4)},201);
    } else if(endpoint==='/api/animals/create') {
      const data=JSON.parse(body);assert.equal(data.status,'AVAILABLE');
      const id=uuid(10+(state.animalsCreated||0));state.animalsCreated=(state.animalsCreated||0)+1;
      if(state.failAnimal && state.animalsCreated===2) {save();process.exit(22);}
      if(state.missingAnimalId) {state.records.push({type:'ANIMAL',id});save();emit({name:data.name},201);process.exit(0);}
      state.records.push({type:'ANIMAL',id});save();emit({id},201);
    } else if(method==='DELETE') {
      if(state.deleteFail && endpoint.includes('/animals/')) process.exit(22);
      const id=endpoint.split('/').filter(x=>x!== 'delete').at(-1);
      const record=state.records.find(r=>r.id===id && r.type!=='STAFF_ACCOUNT');
      if(!record) emit({message:'missing'},404);
      else {state.records=state.records.filter(r=>r!==record);save();emit({ok:true});}
    } else fail(`unexpected HTTP ${method} ${endpoint}`);
  }
  process.exit(0);
}

function profile() {
  const requests=[], sleeps=[];
  class Jar {constructor(){this.values={};}set(url,name,value){this.values[name]=value;}clear(){this.values={};}}
  const response = role => ({status:200,cookies:{ci_session:[{value:`session-${role}`}],ci_session_state:[{value:`state-${role}`}],ci_csrf:[{value:`signed-csrf-${role}`}]},json:()=>({csrfToken:`csrf-${role}`,user:{role}})});
  const http={CookieJar:Jar,cookieJar:()=>new Jar()};
  for(const method of ['get','post','put']) http[method]=(url,body,params)=>{if(method==='get'){params=body;body=undefined;}requests.push({method,url,body,params});return response(method==='post' && JSON.parse(body).email.includes('staff') ? 'STAFF' : 'ADOPTER');};
  const fixtures={adopter:{email:'load-adopter',password:'test'},staff:{email:'load-staff',password:'test'},animalIds:[uuid(10),uuid(11),uuid(12)]};
  let random=.1;
  const context={http,check:(res,checks)=>{for(const check of Object.values(checks)) assert(check(res));},sleep:seconds=>sleeps.push(seconds),open:()=>JSON.stringify(fixtures),__ENV:{BASE_URL:'https://fixture.test',K6_FIXTURE_FILE:'fixture.json'},Math:Object.assign(Object.create(Math),{random:()=>random})};
  const source=fs.readFileSync(path.join(loadDir,'k6.js'),'utf8').replace(/^import .*;\n/gm,'').replace('export const options','const options').replace('export function setup','function setup').replace('export default function','function iteration');
  vm.runInNewContext(source+'\nthis.subject={options,setup,iteration};',context);
  const {options,setup,iteration}=context.subject;
  assert.deepEqual(JSON.parse(JSON.stringify(options.stages)),[{duration:'2m',target:300},{duration:'10m',target:300},{duration:'1m',target:700},{duration:'2m',target:700},{duration:'1m',target:0}],'continuous 300-to-700 profile');
  for(const [metric,expected] of Object.entries({http_req_failed:['rate<0.01'],checks:['rate>0.99'],http_req_duration:['p(95)<2000','p(99)<5000']})) assert.deepEqual(JSON.parse(JSON.stringify(options.thresholds[`${metric}{phase:load}`])),expected);
  const data=setup();
  assert.equal(requests.filter(r=>r.url.endsWith('/api/auth/login')).length,2);
  assert(requests.every(r=>r.params.tags.phase==='setup'),'login traffic excluded from load thresholds');
  requests.length=0;
  for(const [weight,expected] of [[.1,'public'],[.599,'public'],[.6,'adopter'],[.799,'adopter'],[.8,'interest'],[.899,'interest'],[.9,'staff'],[.999,'staff']]) {
    random=weight;const start=requests.length;iteration(data);
    const group=requests.slice(start);
    assert.equal(group.length,['public','staff'].includes(expected)?2:1,`request count for ${expected} weight ${weight}`);
    if(expected==='public') assert(group.every(r=>r.method==='get' && r.url.includes('/animals')));
    if(expected==='adopter') assert.equal(group[0].params.jar.values.ci_session,'session-ADOPTER');
    if(expected==='interest') assert(group[0].url.endsWith('/api/adopter/interests'));
    if(expected==='staff') assert.equal(group[0].params.jar.values.ci_session,'session-STAFF');
  }
  assert.equal(sleeps.length,8);assert(sleeps.every(x=>x===1));
  assert(!requests.some(r=>r.url.endsWith('/api/auth/login')));
  assert(requests.some(r=>r.url.endsWith('/dashboard')));
  assert(requests.some(r=>r.method==='put' && r.url.endsWith('/edit')),'staff group must write');
  assert(!requests.some(r=>r.url.endsWith('/api/admin/staff')),'STAFF cannot read ADMIN-only routes');
  for(const r of requests) {
    assert.equal(r.params.tags.phase,'load');
    if(r.url.includes('/animals') && r.method==='get') assert.deepEqual(Object.keys(r.params.jar.values),[],'public requests remain anonymous');
    if(r.url.endsWith('/api/adopter/interests')) assert.equal(r.params.jar.values.ci_session,'session-ADOPTER');
    if(r.method==='put' && r.url.endsWith('/edit')) assert.equal(r.params.jar.values.ci_session,'session-STAFF');
    if(r.method==='put') assert.equal(r.params.headers.Origin,'https://fixture.test');
  }
  console.log('AWS load profile contract: PASS');
}

function lifecycle() {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'load-harness-test-'));
  try {
    const bin=path.join(root,'bin');fs.mkdirSync(bin);
    for(const command of ['aws','curl','docker']) fs.symlinkSync(__filename,path.join(bin,command));
    const fixture=path.join(root,'fixture.json'),stateFile=path.join(root,'state.json');
    const env={...process.env,PATH:`${bin}:${process.env.PATH}`,CI_LOAD_TEST:'true',BASE_URL:'https://fixture.test',AWS_REGION:'eu-west-2',STACK_NAME:'load-disposable',K6_FIXTURE_FILE:fixture,TEST_STATE:stateFile};
    const reset=extra=>{fs.writeFileSync(stateFile,JSON.stringify({purpose:'disposable',records:[],...extra}));if(fs.existsSync(fixture))fs.unlinkSync(fixture);};
    const run=(script,extra={})=>spawnSync('bash',[path.join(loadDir,script)],{env:{...env,...extra},encoding:'utf8'});
    const state=()=>JSON.parse(fs.readFileSync(stateFile));
    const cleanOutput=result=>assert(!/secret-password|session-secret|csrf-secret|state-secret/.test(result.stdout+result.stderr),'output must redact secrets');
    reset();let result=run('create-fixtures.sh',{CI_LOAD_TEST:'false'});assert.notEqual(result.status,0);assert.equal(state().records.length,0);
    reset({purpose:'production'});result=run('create-fixtures.sh');assert.notEqual(result.status,0);assert.equal(state().records.length,0);
    reset();result=run('create-fixtures.sh',{BASE_URL:'http://fixture.test'});assert.notEqual(result.status,0);
    const incomplete=path.join(root,'incomplete-bin');fs.mkdirSync(incomplete);
    for(const command of ['node','bash','dirname','aws','curl','jq']) {
      const target=['aws','curl'].includes(command)?path.join(bin,command):spawnSync('/bin/bash',['-c',`command -v ${command}`],{encoding:'utf8'}).stdout.trim();
      fs.symlinkSync(target,path.join(incomplete,command));
    }
    reset();result=run('create-fixtures.sh',{PATH:incomplete});assert.notEqual(result.status,0);assert.match(result.stderr,/required command is unavailable: openssl/);assert.equal(state().tagChecks,undefined,'dependencies checked before AWS calls');
    reset();result=run('create-fixtures.sh');cleanOutput(result);assert.equal(result.status,0,result.stderr);assert.equal(result.stdout.trim(),'fixtures created: 5');assert.equal(fs.statSync(fixture).mode&0o777,0o600);assert.equal(state().records.length,6);assert.equal(state().adminSessions,0,'setup must revoke temporary admin session');
    result=run('delete-fixtures.sh');cleanOutput(result);assert.equal(result.status,0,result.stderr);assert.equal(state().records.length,0,'no adopter/staff account orphan');assert(!fs.existsSync(fixture));assert(state().tagChecks>=2);assert.equal(state().adminSessions,0,'cleanup must revoke temporary admin session');
    for(const failure of ['failStaff','failAnimal']) {reset({[failure]:true});result=run('create-fixtures.sh');cleanOutput(result);assert.notEqual(result.status,0);assert.equal(state().records.length,0,`${failure}: partial setup must clean up`);assert(!fs.existsSync(fixture));}
    reset({missingAnimalId:true});result=run('create-fixtures.sh');assert.notEqual(result.status,0);assert(fs.existsSync(fixture),'missing returned animal ID must preserve journal, not claim cleanup');
    reset();result=run('create-fixtures.sh');assert.equal(result.status,0,result.stderr);const current=state();current.purpose='production';fs.writeFileSync(stateFile,JSON.stringify(current));result=run('delete-fixtures.sh');assert.notEqual(result.status,0);assert.equal(state().records.length,6);assert(fs.existsSync(fixture));
    reset();assert.equal(run('create-fixtures.sh').status,0);const failed=state();failed.deleteFail=true;fs.writeFileSync(stateFile,JSON.stringify(failed));result=run('delete-fixtures.sh');assert.notEqual(result.status,0,'failed DELETE cannot report successful cleanup');assert(fs.existsSync(fixture),'retain journal for retry');fs.writeFileSync(stateFile,JSON.stringify({...state(),deleteFail:false}));assert.equal(run('delete-fixtures.sh').status,0);assert.equal(state().records.length,0);
    reset({ssmFail:true});assert.equal(run('create-fixtures.sh').status,0);result=run('delete-fixtures.sh');cleanOutput(result);assert.notEqual(result.status,0);assert(fs.existsSync(fixture));
    reset({replaceOnRecheck:true});assert.equal(run('create-fixtures.sh').status,0);result=run('delete-fixtures.sh');assert.notEqual(result.status,0,'stack replacement must block SSM');assert(!state().remoteCleanup);assert(fs.existsSync(fixture));
    for(const dockerFail of [false,true]) {reset({dockerFail});result=run('load-test.sh');cleanOutput(result);assert.equal(result.status,dockerFail?7:0,result.stderr);assert.equal(state().records.length,0);assert(state().docker);}
    reset({ssmFail:true});result=run('load-test.sh');cleanOutput(result);assert.equal(result.status,1,'runner must propagate cleanup failure');assert(fs.existsSync(fixture));assert.equal(state().adminSessions,0);
    for(const image of ['grafana/k6:latest','grafana/k6:0.54.0']) {reset();result=run('load-test.sh',{K6_IMAGE:image});assert.notEqual(result.status,0);assert.equal(state().records.length,0);}
    const remoteEnv={TEST_REMOTE:'true',LOAD_STACK_PURPOSE:'disposable',LOAD_PREFIX:'load-123-0123456789abcdef',LOAD_ADOPTER_EMAIL:'load-123-0123456789abcdef-adopter@example.org',LOAD_STAFF_EMAIL:'load-123-0123456789abcdef-staff@example.org',LOAD_DB_HOST:'db.test.internal',LOAD_ADOPTER_ACCOUNT:uuid(1),LOAD_ADOPTER_PROFILE:uuid(2),LOAD_STAFF_ACCOUNT:uuid(4),LOAD_STAFF_PROFILE:uuid(3)};
    reset({records:[{type:'ADOPTER',id:uuid(1)},{type:'STAFF_ACCOUNT',id:uuid(4)},{type:'UNRELATED',id:uuid(99)}]});
    result=run('cleanup-accounts.sh',remoteEnv);assert.equal(result.status,0,result.stderr);assert.deepEqual(state().records,[{type:'UNRELATED',id:uuid(99)}]);
    result=run('cleanup-accounts.sh',remoteEnv);assert.equal(result.status,0,result.stderr);assert.deepEqual(state().records,[{type:'UNRELATED',id:uuid(99)}]);
    const sqlCalls=state().sqlCalls;
    for(const unsafe of [{CI_LOAD_TEST:'false'},{LOAD_STACK_PURPOSE:'production'},{LOAD_STAFF_EMAIL:'operator@example.test'},{LOAD_ADOPTER_ACCOUNT:"'; DELETE FROM accounts;--"}]) {
      result=run('cleanup-accounts.sh',{...remoteEnv,...unsafe});assert.notEqual(result.status,0);assert.equal(state().sqlCalls,sqlCalls,'reject unsafe input before DB calls');
    }
    console.log('AWS fixture lifecycle: PASS (gates, success, partial failure, cleanup retry, SSM failure, runner exit)');
  } finally {fs.rmSync(root,{recursive:true,force:true});}
}
const mode=process.argv[2]||'all';
if(mode==='all'||mode==='profile') profile();
if(mode==='all'||mode==='lifecycle') lifecycle();
