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
  const signalScript = stage => {
    if(state.cancelAt===stage) {
      delete state.cancelAt;save();
      process.kill(Number(process.env.TEST_SCRIPT_PID),state.cancelSignal||'SIGTERM');
    }
  };
  const fail = message => { console.error(message); process.exit(1); };
  if (args.some(arg => /secret-password|session-secret|csrf-secret/.test(arg))) fail('secret in argv');
  const tool = path.basename(process.argv[1]);
  if (tool === 'aws') {
    if (args[0] === 'cloudformation') {
      state.tagChecks = (state.tagChecks || 0) + 1; save();
      if (args.includes('--query')) {
        const query = args[args.indexOf('--query') + 1];
        console.log(query.includes('Purpose') ? state.purpose : query.includes('AppSecretArn') ? 'arn:test:secret' : query.includes('InstanceId') ? 'i-1234567890abcdef0' : 'db.test.internal');
      } else console.log(JSON.stringify({ Stacks: [{ StackId: state.replaceOnRecheck && state.tagChecks>=3 ? 'arn:test:replacement' : 'arn:test:stack', Tags: [{Key:'Purpose',Value:state.purpose}], Outputs: [{OutputKey:'ElasticIp',OutputValue:'203.0.113.10'},{OutputKey:'AppSecretArn',OutputValue:'arn:test:secret'},{OutputKey:'InstanceId',OutputValue:'i-1234567890abcdef0'},{OutputKey:'RdsEndpoint',OutputValue:'db.test.internal'}]}] }));
    } else if (args[0] === 'secretsmanager') {
      state.secretReads=(state.secretReads||0)+1;save();
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
        const email=sql.match(/email = '([^']+)'/)[1];
        const account=sql.match(/id = NULLIF\('([^']*)'/)[1];
        const profile=sql.match(/profile_id = NULLIF\('([^']*)'/)[1];
        const record=state.records.find(r=>r.type==='ADOPTER' && r.email===email && (!account||r.id===account) && (!profile||r.profileId===profile));
        if(record) console.log(record.profileId);
      } else if (sql.includes('DELETE FROM adopters')) {
        assert.match(sql,/WHERE id = '00000000-0000-4000-8000-000000000002'::uuid AND email = 'load-123-0123456789abcdef-adopter@example.org'/);
        state.profileDeleted=true;
      } else if (sql.includes('DELETE FROM accounts')) {
        assert(state.profileDeleted || !state.records.some(r=>r.type==='ADOPTER'));
        assert.match(sql,/role = 'STAFF' AND profile_type = 'EMPLOYEE'/);
        assert.match(sql,/NOT EXISTS \(SELECT 1 FROM employees WHERE employees.id = accounts.profile_id\)/);
        assert.match(sql,/SELECT 1 \/ CASE WHEN EXISTS/);
        const targets=[...sql.matchAll(/DELETE FROM accounts WHERE email = '([^']+)' AND role = '(ADOPTER|STAFF)' AND profile_type = '(ADOPTER|EMPLOYEE)'([\s\S]*?);/g)];
        assert.equal(targets.length,2);
        state.records=state.records.filter(record=>!targets.some(([,email,role,,clause])=> {
          const account=clause.match(/id = NULLIF\('([^']*)'/)[1];
          const profile=clause.match(/profile_id = NULLIF\('([^']*)'/)[1];
          return record.type===(role==='STAFF'?'STAFF_ACCOUNT':'ADOPTER') && record.email===email && (!account||record.id===account) && (!profile||record.profileId===profile) && (role!=='STAFF'||!state.records.some(r=>r.type==='STAFF' && r.id===record.profileId));
        }));
      } else fail('unexpected SQL');
      save();process.exit(0);
    }
    assert(args.includes('--network') && args.includes('host'));
    assert(args.some(arg => /^grafana\/k6:(?:\d+\.){2}\d+@sha256:[a-f0-9]{64}$/.test(arg)));
    state.docker = true; save();signalScript('docker');process.exit(state.dockerFail ? 7 : 0);
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
    state.httpCalls=(state.httpCalls||0)+1;save();
    if (method !== 'GET') {
      assert((config || args.join('\n')).includes(`Origin: ${new URL(url).origin}`),'mutations require trusted Origin');
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
      if(state.failStaff) {save();emit({error:'rejected'},422);process.exit(0);}
      assert(jar && fs.readFileSync(jar,'utf8').includes('ci_session_state'));
      const data=JSON.parse(body);assert.equal(data.role,'STAFF');
      state.records.push({type:'STAFF',id:uuid(3)},{type:'STAFF_ACCOUNT',email:data.email,id:uuid(4),profileId:uuid(3)});save();emit({role:'STAFF',profileId:uuid(3),accountId:uuid(4)},201);
    } else if(endpoint==='/api/animals/create') {
      const data=JSON.parse(body);assert.equal(data.status,'AVAILABLE');
      const id=uuid(10+(state.animalsCreated||0));state.animalsCreated=(state.animalsCreated||0)+1;
      if(state.failAnimal && state.animalsCreated===2) {save();emit({error:'rejected'},422);process.exit(0);}
      if(state.missingAnimalId) {state.records.push({type:'ANIMAL',id});save();emit({name:data.name},201);process.exit(0);}
      if(state.transportAfterAnimal) {state.records.push({type:'ANIMAL',id,name:data.name});save();process.exit(28);}
      state.records.push({type:'ANIMAL',id});save();emit({id},201);signalScript('animal');
    } else if(method==='DELETE') {
      if(state.deleteFail && endpoint.includes('/animals/')) process.exit(22);
      const id=endpoint.split('/').filter(x=>x!== 'delete').at(-1);
      const record=state.records.find(r=>r.id===id && r.type!=='STAFF_ACCOUNT');
      if(!record) emit({message:'missing'},404);
      else {state.records=state.records.filter(r=>r!==record);save();emit({ok:true});signalScript('delete');}
    } else fail(`unexpected HTTP ${method} ${endpoint}`);
  }
  process.exit(0);
}

function profile() {
  const requests=[], sleeps=[], checks=[];
  class Jar {constructor(){this.values={};}set(url,name,value){this.values[name]=value;}clear(){this.values={};}}
  const bodyOverrides={};
  const selection=(body,selector)=>({
    text:()=>selector==='h1' ? (body.match(/<h1[^>]*>(.*?)<\/h1>/s)?.[1]||'').replace(/<[^>]*>/g,'') : '',
    size:()=>selector.startsWith('a[') && body.includes(selector.match(/href="(.*?)"/)?.[1]||'invalid-href') ? 1 : 0,
  });
  const response = (role,body) => ({status:200,body,cookies:{ci_session:[{value:`session-${role}`}],ci_session_state:[{value:`state-${role}`}],ci_csrf:[{value:`signed-csrf-${role}`}]},html:selector=>selection(body,selector),json:()=>({csrfToken:`csrf-${role}`,user:{role}})});
  const http={CookieJar:Jar,cookieJar:()=>new Jar()};
  for(const method of ['get','post','put']) http[method]=(url,body,params)=>{
    if(method==='get'){params=body;body=undefined;}requests.push({method,url,body,params});
    const endpoint=new URL(url).pathname;
    const markup=endpoint==='/animals' ? fixtures.animalIds.map(id=>`<a href="/animals/${id}">Fixture</a>`).join('') : endpoint.startsWith('/animals/') ? `<h1>${fixtures.prefix}-animal-${fixtures.animalIds.indexOf(endpoint.split('/').at(-1))+1}</h1>` : params.jar.values.ci_session==='session-STAFF' ? '<h1>Team dashboard</h1>' : `<h1>Welcome back, ${fixtures.prefix} Adopter</h1>`;
    return response(method==='post' && JSON.parse(body).email.includes('staff') ? 'STAFF' : 'ADOPTER',bodyOverrides[endpoint]??markup);
  };
  const fixtures={prefix:'load-123-0123456789abcdef',adopter:{email:'load-adopter',password:'test'},staff:{email:'load-staff',password:'test'},animalIds:[uuid(10),uuid(11),uuid(12)]};
  let random=.1;
  const context={http,check:(res,predicates)=>{for(const [label,predicate] of Object.entries(predicates))checks.push({label,passed:predicate(res)});},sleep:seconds=>sleeps.push(seconds),open:()=>JSON.stringify(fixtures),__ENV:{BASE_URL:'https://fixture.test',K6_FIXTURE_FILE:'fixture.json'},Math:Object.assign(Object.create(Math),{random:()=>random})};
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
  assert(checks.every(check=>check.passed),'successful page content passes checks');
  for(const [endpoint,markup,weight] of [
    ['/animals','<h1>Find your companion</h1><h2>Animal data is not available.</h2>',.1],
    [`/animals/${uuid(10)}`,'<h1>Animal profile unavailable.</h1>',.1],
    ['/dashboard','<h1>Adopter dashboard</h1><p>Dashboard data could not be loaded.</p>',.65],
  ]) {
    bodyOverrides[endpoint]=markup;checks.length=0;random=weight;iteration(data);
    assert(checks.some(check=>!check.passed),`200 error page must fail semantic checks: ${endpoint}`);
    delete bodyOverrides[endpoint];
  }
  console.log('AWS load profile contract: PASS');
}

function lifecycle() {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'load-harness-test-'));
  try {
    const bin=path.join(root,'bin');fs.mkdirSync(bin);
    for(const command of ['aws','curl','docker']) fs.symlinkSync(__filename,path.join(bin,command));
    const fixture=path.join(root,'fixture.json'),stateFile=path.join(root,'state.json');
    const env={...process.env,PATH:`${bin}:${process.env.PATH}`,CI_LOAD_TEST:'true',BASE_URL:'https://203.0.113.10',AWS_REGION:'eu-west-2',STACK_NAME:'load-disposable',K6_FIXTURE_FILE:fixture,TEST_STATE:stateFile};
    const reset=extra=>{fs.writeFileSync(stateFile,JSON.stringify({purpose:'disposable',records:[],...extra}));if(fs.existsSync(fixture))fs.unlinkSync(fixture);};
    const run=(script,extra={})=>spawnSync('bash',['-c','export TEST_SCRIPT_PID=$$; exec bash "$1"','test',path.join(loadDir,script)],{env:{...env,...extra},encoding:'utf8'});
    const state=()=>JSON.parse(fs.readFileSync(stateFile));
    const cleanOutput=result=>assert(!/secret-password|session-secret|csrf-secret|state-secret/.test(result.stdout+result.stderr),'output must redact secrets');
    reset();let result=run('create-fixtures.sh',{CI_LOAD_TEST:'false'});assert.notEqual(result.status,0);assert.equal(state().records.length,0);
    reset({purpose:'production'});result=run('create-fixtures.sh');assert.notEqual(result.status,0);assert.equal(state().records.length,0);
    reset();result=run('create-fixtures.sh',{BASE_URL:'http://fixture.test'});assert.notEqual(result.status,0);
    reset();result=run('create-fixtures.sh',{BASE_URL:'https://attacker.test'});assert.notEqual(result.status,0,'target must match disposable stack ElasticIp');assert.equal(state().secretReads,undefined);assert.equal(state().httpCalls,undefined);
    const incomplete=path.join(root,'incomplete-bin');fs.mkdirSync(incomplete);
    for(const command of ['node','bash','dirname','aws','curl','jq']) {
      const target=['aws','curl'].includes(command)?path.join(bin,command):spawnSync('/bin/bash',['-c',`command -v ${command}`],{encoding:'utf8'}).stdout.trim();
      fs.symlinkSync(target,path.join(incomplete,command));
    }
    reset();result=run('create-fixtures.sh',{PATH:incomplete});assert.notEqual(result.status,0);assert.match(result.stderr,/required command is unavailable: openssl/);assert.equal(state().tagChecks,undefined,'dependencies checked before AWS calls');
    reset();result=run('create-fixtures.sh');cleanOutput(result);assert.equal(result.status,0,result.stderr);assert.equal(result.stdout.trim(),'fixtures created: 5');assert.equal(fs.statSync(fixture).mode&0o777,0o600);assert.equal(state().records.length,6);assert.equal(state().adminSessions,0,'setup must revoke temporary admin session');
    const beforeMismatch=state().httpCalls;result=run('delete-fixtures.sh',{BASE_URL:'https://attacker.test'});assert.notEqual(result.status,0);assert.equal(state().httpCalls,beforeMismatch,'cleanup mismatch rejected before credential transmission');assert.equal(state().records.length,6);
    result=run('delete-fixtures.sh');cleanOutput(result);assert.equal(result.status,0,result.stderr);assert.equal(state().records.length,0,'no adopter/staff account orphan');assert(!fs.existsSync(fixture));assert(state().tagChecks>=2);assert.equal(state().adminSessions,0,'cleanup must revoke temporary admin session');
    for(const failure of ['failStaff','failAnimal']) {reset({[failure]:true});result=run('create-fixtures.sh');cleanOutput(result);assert.notEqual(result.status,0);assert.equal(state().records.length,0,`${failure}: partial setup must clean up`);assert(!fs.existsSync(fixture));}
    reset({missingAnimalId:true});result=run('create-fixtures.sh');assert.notEqual(result.status,0);assert(fs.existsSync(fixture),'missing returned animal ID must preserve journal, not claim cleanup');
    reset({transportAfterAnimal:true});result=run('create-fixtures.sh');assert.notEqual(result.status,0);assert(fs.existsSync(fixture),'commit then transport failure must retain journal');const pending=JSON.parse(fs.readFileSync(fixture)).pendingMutation;assert.equal(pending.endpoint,'/api/animals/create');assert.equal(pending.identity,state().records.find(r=>r.type==='ANIMAL').name);assert.equal(fs.statSync(fixture).mode&0o777,0o600);
    reset();result=run('create-fixtures.sh');assert.equal(result.status,0,result.stderr);const current=state();current.purpose='production';fs.writeFileSync(stateFile,JSON.stringify(current));result=run('delete-fixtures.sh');assert.notEqual(result.status,0);assert.equal(state().records.length,6);assert(fs.existsSync(fixture));
    reset();assert.equal(run('create-fixtures.sh').status,0);const failed=state();failed.deleteFail=true;fs.writeFileSync(stateFile,JSON.stringify(failed));result=run('delete-fixtures.sh');assert.notEqual(result.status,0,'failed DELETE cannot report successful cleanup');assert(fs.existsSync(fixture),'retain journal for retry');fs.writeFileSync(stateFile,JSON.stringify({...state(),deleteFail:false}));assert.equal(run('delete-fixtures.sh').status,0);assert.equal(state().records.length,0);
    reset({ssmFail:true});assert.equal(run('create-fixtures.sh').status,0);result=run('delete-fixtures.sh');cleanOutput(result);assert.notEqual(result.status,0);assert(fs.existsSync(fixture));
    reset({replaceOnRecheck:true});assert.equal(run('create-fixtures.sh').status,0);result=run('delete-fixtures.sh');assert.notEqual(result.status,0,'stack replacement must block SSM');assert(!state().remoteCleanup);assert(fs.existsSync(fixture));
    for(const dockerFail of [false,true]) {reset({dockerFail});result=run('load-test.sh');cleanOutput(result);assert.equal(result.status,dockerFail?7:0,result.stderr);assert.equal(state().records.length,0);assert(state().docker);}
    for(const [cancelSignal,status] of [['SIGTERM',143],['SIGINT',130]]) {
      reset({cancelAt:'docker',cancelSignal});result=run('load-test.sh');cleanOutput(result);assert.equal(result.status,status,'runner cancellation must return signal status');assert.equal(state().records.length,0,'runner cancellation must delete fixtures');assert(!fs.existsSync(fixture));assert.equal(state().adminSessions,0);
      reset({cancelAt:'animal',cancelSignal});result=run('create-fixtures.sh');cleanOutput(result);assert.equal(result.status,status,'create cancellation must return signal status');assert(fs.existsSync(fixture),'ambiguous cancelled POST retains journal');assert.equal(state().adminSessions,0);
      reset();assert.equal(run('create-fixtures.sh').status,0);fs.writeFileSync(stateFile,JSON.stringify({...state(),cancelAt:'delete',cancelSignal}));result=run('delete-fixtures.sh');cleanOutput(result);assert.equal(result.status,status,'delete cancellation must return signal status');assert(fs.existsSync(fixture));assert.equal(state().adminSessions,0);assert.equal(run('delete-fixtures.sh').status,0);assert.equal(state().records.length,0);
    }
    reset({ssmFail:true});result=run('load-test.sh');cleanOutput(result);assert.equal(result.status,1,'runner must propagate cleanup failure');assert(fs.existsSync(fixture));assert.equal(state().adminSessions,0);
    for(const image of ['grafana/k6:latest','grafana/k6:0.54.0']) {reset();result=run('load-test.sh',{K6_IMAGE:image});assert.notEqual(result.status,0);assert.equal(state().records.length,0);}
    const remoteEnv={TEST_REMOTE:'true',LOAD_STACK_PURPOSE:'disposable',LOAD_PREFIX:'load-123-0123456789abcdef',LOAD_ADOPTER_EMAIL:'load-123-0123456789abcdef-adopter@example.org',LOAD_STAFF_EMAIL:'load-123-0123456789abcdef-staff@example.org',LOAD_DB_HOST:'db.test.internal',LOAD_ADOPTER_ACCOUNT:uuid(1),LOAD_ADOPTER_PROFILE:uuid(2),LOAD_STAFF_ACCOUNT:uuid(4),LOAD_STAFF_PROFILE:uuid(3)};
    const sentinels=[{type:'ADOPTER',id:uuid(99),profileId:uuid(98),email:'another-adopter@example.test'},{type:'STAFF_ACCOUNT',id:uuid(97),profileId:uuid(96),email:'another-staff@example.test'}];
    reset({records:[{type:'ADOPTER',id:uuid(1),profileId:uuid(2),email:remoteEnv.LOAD_ADOPTER_EMAIL},{type:'STAFF_ACCOUNT',id:uuid(4),profileId:uuid(3),email:remoteEnv.LOAD_STAFF_EMAIL},...sentinels]});
    result=run('cleanup-accounts.sh',remoteEnv);assert.equal(result.status,0,result.stderr);assert.deepEqual(state().records,sentinels,'same-role unrelated accounts must survive exact emitted SQL predicates');
    result=run('cleanup-accounts.sh',remoteEnv);assert.equal(result.status,0,result.stderr);assert.deepEqual(state().records,sentinels);
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
