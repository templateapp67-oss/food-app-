import {useOperations} from './useOperations';
import type {OperationsProps} from './types';
import RestaurantDashboard from './RestaurantDashboard';
import AdminDashboard from './AdminDashboard';
import RiderView from './RiderView';
export default function OperationsDashboard(props:OperationsProps){const ops=useOperations(props);return <div className="ops"><div className="flex flex-wrap justify-between gap-3 mb-4"><span className="ops-status" role="status">{ops.connection}</span><button className="secondary" onClick={()=>void ops.reload()} disabled={ops.busy}>Refresh workspace</button></div>{props.demo&&<p className="ops-alert">Demo workspace · Changes are saved on this device. No real dispatches, documents or bank payouts.</p>}{ops.error&&<div className="error-banner" role="alert">{ops.error}<button onClick={()=>ops.setError('')}>Dismiss</button></div>}{ops.loading?<p role="status">Loading workspace…</p>:props.role==='restaurant'?<RestaurantDashboard props={props} ops={ops}/>:props.role==='admin'?<AdminDashboard props={props} ops={ops}/>:<RiderView props={props} ops={ops}/>}</div>}
