import {test,expect} from '@playwright/test';
for(const route of ['terms','privacy','refund-policy','delete-account'])test('public '+route+' works logged out',async({page})=>{
 await page.goto('/#/'+route);await expect(page.getByRole('heading',{level:1})).toBeVisible();await expect(page.getByText('Draft — requires owner/legal review',{exact:true})).toBeVisible();await expect(page.getByRole('navigation',{name:'Legal policies'}).first()).toBeVisible();
});
test('public deletion never accepts email as deletion authorization',async({page})=>{
 await page.goto('/#/delete-account');await expect(page.getByRole('heading',{name:'Cannot sign in?'})).toBeVisible();await expect(page.getByText(/An email alone cannot delete an account/)).toBeVisible();await page.getByRole('button',{name:'Sign in to request deletion'}).click();await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByLabel('Password',{exact:true})).toBeVisible();
});
