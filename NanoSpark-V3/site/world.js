import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

const root=document.getElementById('world');
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x070707);
scene.fog=new THREE.Fog(0x070707,18,55);
const camera=new THREE.PerspectiveCamera(72,innerWidth/innerHeight,.1,100);
camera.position.set(0,1.7,10);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;root.appendChild(renderer.domElement);

const controls=new PointerLockControls(camera,renderer.domElement);
scene.add(controls.getObject());
const clock=new THREE.Clock();
const keys={}; let entered=false; let velocity=new THREE.Vector3(); let canMove=true;

const zones={
 electronics:{name:'Electronics',color:0xffc107,pos:new THREE.Vector3(-8,0,-7),desc:'Circuits, sensors, Arduino, soldering and practical electronics.'},
 coding:{name:'Coding',color:0x62d9ff,pos:new THREE.Vector3(8,0,-7),desc:'Programming workstations for digital development.'},
 robotics:{name:'Robotics',color:0xff6b6b,pos:new THREE.Vector3(-8,0,6),desc:'Robots, automation and physical computing projects.'},
 iot:{name:'IoT',color:0x8ef07a,pos:new THREE.Vector3(8,0,6),desc:'Sensors, connectivity and smart-device experiments.'},
 innovation:{name:'Innovation',color:0xc48cff,pos:new THREE.Vector3(0,0,-15),desc:'Project building, prototyping and student ideas.'},
 safety:{name:'Safety',color:0xffffff,pos:new THREE.Vector3(0,0,14),desc:'Safe practical learning, first aid and lab protection.'}
};

function mat(color,rough=.65,metal=0){return new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal});}
function box(name,size,pos,material,interactive=false,data={}){const m=new THREE.Mesh(new THREE.BoxGeometry(...size),material);m.name=name;m.position.copy(pos);m.castShadow=true;m.receiveShadow=true;m.userData={interactive,data};scene.add(m);return m;}
function label(text,pos,color=0xffffff,scale=1){const c=document.createElement('canvas');c.width=512;c.height=128;const x=c.getContext('2d');x.clearRect(0,0,c.width,c.height);x.fillStyle='#000000b8';x.roundRect(8,8,496,112,22);x.fill();x.fillStyle='#'+color.toString(16).padStart(6,'0');x.font='700 38px Inter';x.textAlign='center';x.textBaseline='middle';x.fillText(text,256,64);const t=new THREE.CanvasTexture(c);const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthWrite:false}));s.position.copy(pos);s.scale.set(4*scale,1*scale,1);scene.add(s);return s;}
function glow(pos,color){const g=new THREE.PointLight(color,2.5,7);g.position.copy(pos);scene.add(g);const o=new THREE.Mesh(new THREE.SphereGeometry(.12,16,16),new THREE.MeshBasicMaterial({color}));o.position.copy(pos);scene.add(o);}

// Room
const floor=box('Floor',[36,.3,42],[0,-.2,0],mat(0x222222,.85));
box('BackWall',[36,6,.35],[0,2,-21],mat(0x151515));box('FrontWall',[36,6,.35],[0,2,21],mat(0x151515));box('LeftWall',[.35,6,42],[-18,2,0],mat(0x151515));box('RightWall',[.35,6,42],[18,2,0],mat(0x151515));
// ceiling beams
for(let z=-18;z<=18;z+=6)box('Beam',[36,.25,.25],[0,5.8,z],mat(0x303030));
const hemi=new THREE.HemisphereLight(0xffffff,0x111111,1.2);scene.add(hemi);const key=new THREE.DirectionalLight(0xffffff,2);key.position.set(8,12,8);key.castShadow=true;key.shadow.mapSize.set(2048,2048);scene.add(key);
for(let x=-12;x<=12;x+=6){for(let z=-15;z<=15;z+=6){const l=new THREE.PointLight(0xffd36a,1.1,9);l.position.set(x,5.1,z);scene.add(l);}}

// Zone structures
function makeZone(id){const z=zones[id], p=z.pos;label(z.name,new THREE.Vector3(p.x,3.9,p.z),z.color,1.0);glow(new THREE.Vector3(p.x,2.7,p.z),z.color);box(id+' platform',[7,.25,5],[p.x,-.02,p.z],mat(0x2a2a2a));
  // back feature wall
  box(id+' wall',[7,3.4,.2],[p.x,1.65,p.z-2.35],new THREE.MeshStandardMaterial({color:0x191919,roughness:.8}));
}
Object.keys(zones).forEach(makeZone);

// Work tables and equipment
function table(x,z){box('Workbench',[5,.25,2.2],[x,1,z],mat(0x3a3a3a,.5,0.1));for(const sx of [-2.2,2.2])for(const sz of [-.8,.8])box('leg',[.18,2,.18],[x+sx,0, z+sz],mat(0x777777,.5,.3));}
function panelTexture(path,x,y,z,w=2.6,h=1.7,interactive=false,data={}){const loader=new THREE.TextureLoader();const tex=loader.load(path);tex.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide}));m.position.set(x,y,z);m.rotation.y=Math.PI;m.userData={interactive,data};m.castShadow=true;scene.add(m);return m;}

table(-8,-7);panelTexture('assets/electronicszone.png',-8,2.35,-9.1,5.3,2.2,true,{title:'Electronics Workbench',text:'A practical area for circuits, breadboards, sensors, LEDs, jumpers and measurement tools.',tag:'ELECTRONICS'});
box('Arduino Uno',[1.5,.25,.9],[-9,1.32,-7],mat(0x087f47,.45,.1),true,{title:'Arduino Uno',text:'A programmable microcontroller board used to build electronics and robotics projects.',tag:'ELECTRONICS'});box('Multimeter',[.8,.35,.6],[-7,1.3,-7],mat(0x303030,.5),true,{title:'Digital Multimeter',text:'Used for practical voltage, resistance and continuity measurements.',tag:'ELECTRONICS'});

table(8,-7);panelTexture('assets/coding-zone.png',8,2.35,-9.1,5.3,2.2,true,{title:'Coding Zone',text:'Programming workstations for learning software, logic and digital development.',tag:'CODING'});box('Monitor',[1.8,1.2,.12],[8,2,-8.3],mat(0x080808,.2),true,{title:'Coding Station',text:'A digital development workstation for programming and project control.',tag:'CODING'});

table(-8,6);panelTexture('assets/robotics-zone.png',-8,2.35,3.7,5.3,2.2,true,{title:'Robotics Zone',text:'Robots, automation and physical computing come together here.',tag:'ROBOTICS'});box('Robot',[1.3,.8,1],[-8,1.55,6],mat(0xc7c7c7,.35,.2),true,{title:'Mobile Robot',text:'A project platform for sensors, motors, control logic and autonomous behavior.',tag:'ROBOTICS'});

table(8,6);panelTexture('assets/iot-zone.png',8,2.35,3.7,5.3,2.2,true,{title:'IoT Zone',text:'Sensors, connectivity and smart technology experiments.',tag:'IOT'});box('Sensor Kit',[1.3,.3,.8],[8,1.25,6],mat(0x1b5e20,.5),true,{title:'Sensor Kit',text:'Sensors provide real-world data that can be connected to controllers and IoT systems.',tag:'IOT'});

table(0,-15);panelTexture('assets/innovation-and-protytping-zone.png',0,2.35,-17.1,5.3,2.2,true,{title:'Innovation & Prototyping',text:'Turn ideas into working prototypes using design, making and experimentation.',tag:'INNOVATION'});box('Prototype',[1.6,.5,1],[-1,1.38,-14.8],mat(0x7b4dff,.5),true,{title:'Student Prototype',text:'A project display area for experiments, prototypes and demonstrations.',tag:'INNOVATION'});

table(0,14);panelTexture('assets/safety-equipemetnst.png',0,2.35,11.9,5.3,2.2,true,{title:'Safety Zone',text:'Protective equipment and safe practical learning procedures.',tag:'SAFETY'});box('First Aid',[1.2,.8,.5],[0,1.5,14],mat(0xe53935,.45),true,{title:'First Aid Kit',text:'Basic first-aid equipment is kept accessible for safe practical learning.',tag:'SAFETY'});

// Entrance + center signage
label('NANO SPARK STEM LAB',new THREE.Vector3(0,4.4,19),0xffc107,1.3);
for(let x=-12;x<=12;x+=4) box('ceiling-light',[2,.05,.3],[x,5.5,0],mat(0xffd86b,.25));

// interaction raycast
const ray=new THREE.Raycaster();const center=new THREE.Vector2(0,0);let hovered=null;
function showInfo(d){document.getElementById('infoTitle').textContent=d.title;document.getElementById('infoText').textContent=d.text;document.getElementById('infoTag').textContent=d.tag||'NANO SPARK';document.getElementById('info').classList.remove('hidden');}
function hideInfo(){document.getElementById('info').classList.add('hidden');}
function inspect(){ray.setFromCamera(center,camera);const hits=ray.intersectObjects(scene.children,true);const h=hits.find(v=>v.object.userData?.interactive);if(h)showInfo(h.object.userData.data);}
renderer.domElement.addEventListener('click',()=>{if(entered)inspect()});

function goTo(id){const z=zones[id];if(!z)return;controls.getObject().position.set(z.pos.x,z.pos.y+1.7,z.pos.z+4.5);controls.getObject().rotation.y=0;hideInfo();document.querySelectorAll('.zones button').forEach(b=>b.classList.toggle('active',b.dataset.zone===id));}

const zoneBar=document.getElementById('zoneBar');Object.entries(zones).forEach(([id,z])=>{const b=document.createElement('button');b.textContent=z.name;b.dataset.zone=id;b.onclick=()=>{goTo(id);if(!entered)enter()};zoneBar.appendChild(b)});
function enter(){entered=true;controls.lock();document.querySelector('.hud.left').style.opacity='.18';document.getElementById('controls').style.opacity='1';}
document.getElementById('enterBtn').onclick=enter;document.getElementById('closeInfo').onclick=hideInfo;
window.addEventListener('keydown',e=>{keys[e.code]=true;if(e.code==='Escape'){} });window.addEventListener('keyup',e=>keys[e.code]=false);

// Mobile directional controls
for(const b of document.querySelectorAll('#mobilePad button')){b.addEventListener('pointerdown',()=>keys[b.dataset.key]=true);b.addEventListener('pointerup',()=>keys[b.dataset.key]=false);b.addEventListener('pointercancel',()=>keys[b.dataset.key]=false);b.addEventListener('pointerleave',()=>keys[b.dataset.key]=false)}

// AI — local knowledge/actions, ready to swap to an API later
const knowledge={arduino:'Arduino Uno is a programmable microcontroller board used for electronics, sensors, robotics and automation projects.',esp32:'ESP32 is a Wi-Fi/Bluetooth capable microcontroller commonly used for connected and IoT projects.',robotics:'The Robotics Zone focuses on robots, motors, sensors, automation and control.',electronics:'The Electronics Zone covers circuits, breadboards, LEDs, sensors, jumper wires, soldering and measurement.',coding:'The Coding Zone is for programming, digital development and controlling physical projects.',iot:'The IoT Zone focuses on sensors, connectivity and smart technology.',innovation:'The Innovation Zone is for prototyping, project building and turning ideas into working solutions.',safety:'The Safety Zone covers practical lab safety and accessible protective equipment.'};
function aiAnswer(q){const s=q.toLowerCase();for(const k of Object.keys(zones)){if(s.includes(k)){goTo(k);return `Taking you to the ${zones[k].name} Zone. ${zones[k].desc}`}}if(s.includes('arduino'))return knowledge.arduino;if(s.includes('esp32'))return knowledge.esp32;if(s.includes('multimeter'))return 'A digital multimeter measures electrical values such as voltage, resistance and continuity.';if(s.includes('what can')||s.includes('learn'))return 'Nano Spark brings electronics, coding, robotics, IoT, innovation and safety into one practical STEM environment.';return 'I can guide you to Electronics, Coding, Robotics, IoT, Innovation or Safety, and explain common lab equipment.'}
const aiPanel=document.getElementById('ai'),chat=document.getElementById('chat');function addMsg(text,type){const d=document.createElement('div');d.className='msg '+type;d.textContent=text;chat.appendChild(d);chat.scrollTop=chat.scrollHeight}
function ask(q){if(!q.trim())return;addMsg(q,'user');setTimeout(()=>addMsg(aiAnswer(q),'bot'),180)}
document.getElementById('aiOpen').onclick=()=>aiPanel.classList.add('open');document.getElementById('aiClose').onclick=()=>aiPanel.classList.remove('open');document.getElementById('aiForm').onsubmit=e=>{e.preventDefault();const i=document.getElementById('aiInput');ask(i.value);i.value=''};document.querySelectorAll('.suggestions button').forEach(b=>b.onclick=()=>ask(b.dataset.q));

document.getElementById('helpBtn').onclick=()=>document.getElementById('help').classList.remove('hidden');document.getElementById('helpClose').onclick=()=>document.getElementById('help').classList.add('hidden');

controls.addEventListener('lock',()=>entered=true);controls.addEventListener('unlock',()=>entered=false);
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});

setTimeout(()=>document.getElementById('boot').classList.add('done'),900);

function tick(){requestAnimationFrame(tick);const dt=Math.min(clock.getDelta(),.05);if(entered&&canMove){const speed=5.2;velocity.set(0,0,0);if(keys.KeyW)velocity.z-=1;if(keys.KeyS)velocity.z+=1;if(keys.KeyA)velocity.x-=1;if(keys.KeyD)velocity.x+=1;if(velocity.length()>0){velocity.normalize();controls.moveRight(velocity.x*speed*dt);controls.moveForward(-velocity.z*speed*dt)}const p=controls.getObject().position;p.x=THREE.MathUtils.clamp(p.x,-16.5,16.5);p.z=THREE.MathUtils.clamp(p.z,-19.5,19.5);p.y=1.7;}
  ray.setFromCamera(center,camera);const hit=ray.intersectObjects(scene.children,true).find(v=>v.object.userData?.interactive);document.getElementById('reticle').classList.toggle('on',!!hit);renderer.render(scene,camera)}tick();
