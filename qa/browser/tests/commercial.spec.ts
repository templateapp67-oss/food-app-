import {test,expect} from '@playwright/test';
test('commercial workspace opens from live navigation and renders all eight tabs',async({page})=>{
 await page.goto('/');await page.getByRole('combobox',{name:'Workspace',exact:true}).selectOption('commercial');
 await expect(page).toHaveURL(/#\/commercial/);
 await expect(page.getByRole('heading',{name:'Partner Commercials & Onboarding',exact:true})).toBeVisible();
 await expect(page.getByText(/Sample workspace: applications/)).toBeVisible();
 for(const name of ['Payout Calculator','Onboarding Pipeline','Commercial Plans','Partner Agreement','Legal & Tax Review','Restaurant Partner Portal','Admin Control Centre','Notification Setup']){
  const tab=page.getByRole('button',{name,exact:true});await tab.scrollIntoViewIfNeeded();await tab.click();
  await expect(page.locator('.comm-container')).toBeVisible();
 }
 await page.reload();await expect(page.getByRole('heading',{name:'Partner Commercials & Onboarding',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
});
test('commercial direct link supports Hindi preview',async({page})=>{
 await page.goto('/#/commercial');await page.getByRole('button',{name:'हिंदी में देखें'}).click();
 await expect(page.getByText(/नमूना कार्यक्षेत्र/)).toBeVisible();
 await expect(page.getByRole('button',{name:'कमाई कैलकुलेटर',exact:true})).toBeVisible();
});
