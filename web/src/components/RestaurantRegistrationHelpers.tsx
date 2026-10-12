import {useId} from 'react';

export function normalizeRestaurantSlug(value:string,final=true){
 const slug=value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+/,'');
 return final?slug.replace(/-+$/,''):slug;
}
export function RestaurantSlugField(){
 const helpId=useId();
 return <label>URL slug<input aria-label="URL slug" aria-describedby={helpId} name="slug" required maxLength={120} pattern="[a-z0-9]+(-[a-z0-9]*)*" placeholder="rambharose-cafe" autoCapitalize="none" autoCorrect="off" spellCheck={false} onChange={e=>{e.currentTarget.value=normalizeRestaurantSlug(e.currentTarget.value,false)}} onBlur={e=>{e.currentTarget.value=normalizeRestaurantSlug(e.currentTarget.value)}}/><small id={helpId} className="muted">Use lowercase letters, numbers, and hyphens only, e.g., rambharose-cafe. Capitals and spaces are converted automatically.</small></label>;
}
export function CoordinatesHelper(){
 return <p className="small muted"><a href="https://www.google.com/maps" target="_blank" rel="noopener noreferrer" style={{color:'var(--accent)',textDecoration:'underline'}}>Get coordinates from Google Maps ↗</a><br/>Find your exact restaurant location and drop a pin. Copy latitude (first number) and longitude (second number) into the fields below.</p>;
}
