import {it,expect} from 'vitest';import {placeOrder} from './api';
it('rejects online payment orders before invoking a gateway or RPC',async()=>{await expect(placeOrder('r',[],{id:'a'}as never,'',0,'key','online','quote')).rejects.toThrow('Only Cash on Delivery');});
