const {chromium}=require('playwright');
const {pathToFileURL}=require('url');
const path=require('path');
(async()=>{
let browser=await chromium.launch({headless:true,args:['--no-sandbox']});
let results=[],fail=[];
async function test(name,fn){try{await fn();results.push({name,status:'PASS'});console.log('PASS',name)}catch(e){results.push({name,status:'FAIL',error:String(e.message).slice(0,250)});fail.push(name);console.log('FAIL',name,e.message)}}
for(const [kind,file] of [['web','index.html'],['mobile','mobile.html']]){
const page=await browser.newPage({viewport:kind==='mobile'?{width:390,height:844}:{width:1400,height:900}});
let errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(pathToFileURL(path.resolve(__dirname,'..',file)).href,{waitUntil:'load'});
await test(kind+' carga sin error JavaScript',async()=>{if(errors.length)throw Error(errors.join(' | '));await page.locator('#form').waitFor()});
await test(kind+' conserva duración editable 30',async()=>{const d=page.locator('#duration');if(await d.inputValue()!=='30')throw Error('valor '+await d.inputValue());await d.fill('37');if(await d.inputValue()!=='37')throw Error('No editable')});
await test(kind+' conserva interacción de navegación',async()=>{if(kind==='web'){for(const v of ['week','month','day']){await page.locator('.tab[data-view="'+v+'"]').click();if(!(await page.locator('.tab[data-view="'+v+'"]').getAttribute('class')).includes('active'))throw Error('Tab '+v)}}else{let a=await page.locator('#dateTitle').innerText();await page.locator('#next').click();let b=await page.locator('#dateTitle').innerText();if(a===b)throw Error('fecha no avanzó');await page.locator('#prev').click()}});
await test(kind+' flujo abrir nuevo evento',async()=>{if(kind==='web'){await page.locator('#createBtn').click();await page.locator('#createEvent').click();if(await page.locator('#modal').evaluate(el=>getComputedStyle(el).display)==='none')throw Error('modal cerrado')}else{await page.locator('#add').click();await page.locator('#chooseEvent').click();if(await page.locator('#formBg').evaluate(el=>getComputedStyle(el).display)==='none')throw Error('form cerrado')}});
await test(kind+' duración negativa rechazada',async()=>{await page.locator('#duration').fill('-2');if(await page.locator('#duration').inputValue()!=='-2')throw Error('form invalid'); // HTML min validation keeps submit blocked
let valid=await page.locator('#duration').evaluate(el=>el.checkValidity());if(valid)throw Error('Duración negativa aceptada');await page.locator('#duration').fill('30')});
await test(kind+' cierre de formulario',async()=>{if(kind==='web'){await page.locator('#close').click();if(await page.locator('#modal').evaluate(el=>getComputedStyle(el).display)!=='none')throw Error('modal abierto')}else{await page.locator('#closeForm').click();if(await page.locator('#formBg').evaluate(el=>getComputedStyle(el).display)!=='none')throw Error('form abierto')}});
await test(kind+' conserva controles de ruta y tareas',async()=>{if(kind==='web'){if(await page.locator('#suggestRoute').count()!==1||await page.locator('#newTaskInline').count()!==1)throw Error('faltan controles')}else{if(await page.locator('#prepareRoute').count()!==1||await page.locator('#tasksBtn').count()!==1)throw Error('faltan controles')}});
await test(kind+' no genera errores al operar',async()=>{if(errors.length)throw Error(errors.join(' | '))});
await page.close();
}
console.log(JSON.stringify({results,failed:fail.length,total:results.length},null,2));await browser.close();if(fail.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});