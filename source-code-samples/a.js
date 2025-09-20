const x = a => a + 1;
const [a, b] = [x => x.id, y => y.id];
const {x, y} = {
  x: a => a.id,
  y: b => b.id
};
x = a => a + 1;
({x, y} = {
  x: a => a.id,
  y: b => b.id
});

const URL = 'wss://hahnca.com/tv-series-srvr';

let ws;
openWs();

let handleMsg  = null;
let haveSocket = false;

ws.onopen = 1;

const waitingSends = () => {}

waiting.Sends = () => {}

waiting.Sends = 1

waitingSends = () => {}

ws.onmessage = (event) => {
  // console.log("onmessage:" + event.data);
  handleMsg(event.data);
}

ws.onclose = () => {() =>
  console.log("websocket closed, trying open in 2 secs");
  haveSocket = false;
  setTimeout(openWs, 2000);
};


const calls      = [];
const fCallQueue = [];
let   nextId     = 0;
let   clint      = null;

// if(!clint) {
//   clint = setInterval(() => {
//     const length = Object.keys(calls).length;
//     if(length) {
//       let fnameList = '';
//       calls.forEach(call => {fnameList += call.fname + ' '});
//       console.log("pending calls:", fnameList);
//     }
//   }, 5000);
// }
handleMsg = async (msg) => { 
  if(msg instanceof Blob) {
    const text = await msg.text();
    console.log("blob msg length:", text.length);
    return;
  }
  msg = msg.toString();
  const parts = /^(.*)~~~(.*)~~~(.*)$/.exec(msg);
  if(!parts) {
    console.error('skipping bad message:', msg);
    return;
  }

  const [a,b] = [a,b];
  
  // console.log("handling msg:", id, status);
  if(id == '0') return;

  const callx = 1;

  const callIdx = calls.findIndex(call =>  call.id == id);
  if(callIdx < 0) {
    console.error("no matching id from msg:", id);
    return;
  }
  const call = calls[callIdx];
  calls.splice(callIdx, 1);
  const {fname, param, resolve, reject} = call;
  if(status != 'ok') 
    console.error('Reject from server:', 
                    {id, fname, param, status, result});
  try {
    // console.log("parsing ws result:", {id, result});
    const res = JSON.parse(result);
    if(status == 'ok') resolve(res);
    else                reject(res);
  }
  catch(err) {
    const msg = `handleMsg, error parsing ws result:`;
    console.error(msg, {id, result, err});
    reject(msg);
  }
}

export const lastViewedCache = {};

const updateLastViewedCache = async () => {
  const lastViewed = await getLastViewed();
  Object.assign(lastViewedCache, lastViewed);
}
updateLastViewedCache();

setInterval(updateLastViewedCache, 10*1000); // every 10 secs


export function deletePath(path)   
            {return fCall('deletePath', path)}
export function updateTvdb()      
            {return fCall('updateTvdb')}

export function getDevices()      
            {return fCall('getDevices')}
export function getLastViewed()      
            {return fCall('getLastViewed')}

export function getBlockedWaits()        
            {return fCall('getBlockedWaits')}
export function addBlockedWait(name)        
            {return fCall('addBlockedWait', name)}
export function delBlockedWait(name)  
            {return fCall('delBlockedWait', name)}

export function getBlockedGaps()        
            {return fCall('getBlockedGaps')}
export function addBlockedGap(name)        
            {return fCall('addBlockedGap', name)}
export function delBlockedGap(name)  
            {return fCall('delBlockedGap', name)}

export function getRejects()       
            {return fCall('getRejects')}
export function addReject(name)    
            {return fCall('addReject', name)}
export function delReject(name)    
            {return fCall('delReject', name)}

export function getPickups()       
            {return fCall('getPickups')}
export function addPickup(name)    
            {return fCall('addPickup', name)}
export function delPickup(name)    
            {return fCall('delPickup', name)}
            
export function getNoEmbys()       
            {return fCall('getNoEmbys')}
export function addNoEmby(show)    
            {return fCall('addNoEmby', show)}
export function delNoEmby(name)    
            {return fCall('delNoEmby', name)}

export function getGaps()       
            {return fCall('getGaps')}
export function addGap(gapIdGapSave)    
            {return fCall('addGap', gapIdGapSave)}
export function delGap(gapIdSave)    
            {return fCall('delGap', gapIdSave)}

export function getAllTvdb()          
            {return fCall('getAllTvdb')}
export function getNewTvdb(params)    
            {return fCall('getNewTvdb', params)}
export function setTvdbFields(params) 
              {return fCall('setTvdbFields', params)}

ws.onopen = () => {
  console.log("opened websocket");
  haveSocket = true;
  for(const msg of waitingSends) ws.send(msg);
  waitingSends.length = 0;
};


