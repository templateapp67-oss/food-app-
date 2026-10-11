// Jaipur is the only launch city. Localities are discovery choices, not delivery-zone guarantees.
export const launchCity = 'Jaipur';
export const launchState = 'Rajasthan';
export const jaipurLocalities = ['C Scheme','Malviya Nagar','Vaishali Nagar','Mansarovar','Raja Park','Tonk Road','Jagatpura','Pratap Nagar','Sanganer','Civil Lines','Bani Park','Vidhyadhar Nagar','Shastri Nagar','Jhotwara','Sodala','Ajmer Road','Adarsh Nagar','Jawahar Nagar'] as const;
export const isJaipur = (city:string) => city.trim().toLowerCase() === 'jaipur';
export function requireJaipur(city:string){if(!isJaipur(city))throw new Error('Nexora Food currently supports Jaipur only. Please choose a Jaipur delivery address.');}
