// Straight-line distance for discovery; delivery eligibility is checked server-side.
export function distanceKm(lat1:number,lng1:number,lat2:number,lng2:number){
 if(![lat1,lng1,lat2,lng2].every(Number.isFinite))return null;
 const rad=(v:number)=>v*Math.PI/180,dLat=rad(lat2-lat1),dLng=rad(lng2-lng1);
 const a=Math.sin(dLat/2)**2+Math.cos(rad(lat1))*Math.cos(rad(lat2))*Math.sin(dLng/2)**2;
 return Math.round(6371*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))*10)/10;
}
