import {useState} from 'react';
import {inJaipurBounds} from './locations';
const tileSize=256;
export function toWorld(lat:number,lng:number,zoom:number){const size=tileSize*2**zoom;return{x:(lng+180)/360*size,y:(1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*size}}
export function fromWorld(x:number,y:number,zoom:number){const size=tileSize*2**zoom;return{latitude:Math.atan(Math.sinh(Math.PI*(1-2*y/size)))*180/Math.PI,longitude:x/size*360-180}}
export default function DeliveryMap({latitude,longitude,onConfirm}:{latitude:number;longitude:number;onConfirm:(point:{latitude:number;longitude:number})=>void}){
 const[center,setCenter]=useState({latitude,longitude}),[zoom,setZoom]=useState(16),[pin,setPin]=useState(center),[picked,setPicked]=useState(false);
 const world=toWorld(center.latitude,center.longitude,zoom),point=toWorld(pin.latitude,pin.longitude,zoom),origin={x:Math.floor(world.x/256),y:Math.floor(world.y/256)};
 const tiles=[-1,0,1].flatMap(y=>[-1,0,1].map(x=>({x:origin.x+x,y:origin.y+y})));
 return <section aria-label="Choose delivery pin"><strong>Tap your house on the map</strong><p className="small muted">The map starts near your selected area. Move the map with the arrows, zoom in, then tap your delivery entrance.</p>
 <div role="application" aria-label="Delivery map" tabIndex={0} onKeyDown={e=>{const shift:Record<string,[number,number]>={ArrowLeft:[-40,0],ArrowRight:[40,0],ArrowUp:[0,-40],ArrowDown:[0,40]};if(shift[e.key]){e.preventDefault();const[x,y]=shift[e.key];setCenter(fromWorld(world.x+x,world.y+y,zoom))}}} onClick={e=>{const rect=e.currentTarget.getBoundingClientRect();setPin(fromWorld(world.x+e.clientX-rect.left-rect.width/2,world.y+e.clientY-rect.top-rect.height/2,zoom));setPicked(true)}} style={{position:'relative',height:280,width:'100%',overflow:'hidden',borderRadius:16,background:'#eee',cursor:'crosshair',touchAction:'manipulation'}}>
 {tiles.map(t=><img key={`${zoom}/${t.x}/${t.y}`} src={`https://tile.openstreetmap.org/${zoom}/${t.x}/${t.y}.png`} alt="" draggable={false} style={{position:'absolute',width:256,height:256,maxWidth:'none',left:`calc(50% + ${t.x*256-world.x}px)`,top:`calc(50% + ${t.y*256-world.y}px)`,pointerEvents:'none'}}/>)}
 <span aria-hidden="true" style={{position:'absolute',left:`calc(50% + ${point.x-world.x}px)`,top:`calc(50% + ${point.y-world.y}px)`,transform:'translate(-50%,-100%)',fontSize:32,color:'#e24c2b',pointerEvents:'none'}}>📍</span>
 </div><div className="form-row" style={{flexWrap:'wrap',marginTop:8}}>{[['←',-100,0],['↑',0,-100],['↓',0,100],['→',100,0]].map(([label,x,y])=><button key={label} type="button" className="secondary" aria-label={`Move map ${label}`} onClick={()=>setCenter(fromWorld(world.x+Number(x),world.y+Number(y),zoom))}>{label}</button>)}<button type="button" className="secondary" aria-label="Zoom in" onClick={()=>setZoom(Math.min(19,zoom+1))}>+</button><button type="button" className="secondary" aria-label="Zoom out" onClick={()=>setZoom(Math.max(12,zoom-1))}>−</button></div>
 <small>© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a></small>
 <button type="button" className="primary full" disabled={!picked||!inJaipurBounds(pin.latitude,pin.longitude)} onClick={()=>onConfirm(pin)}>Confirm map location</button>
 {!picked&&<p className="small muted">Tap the map to choose a delivery pin before confirming.</p>}
 </section>
}
