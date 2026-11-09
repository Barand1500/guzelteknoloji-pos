import { test, expect } from '@playwright/test';
import { WORKSPACE_RESOURCES } from '../../../packages/shared/src/workspace';

for (const width of [390, 1440]) test(`işletme ekranları ${width}px`, async ({page}, info) => {
  await page.setViewportSize({width,height:900});
  await page.route('**/api/**',async route=>{
    const path=new URL(route.request().url()).pathname;
    const body=path==='/api/auth/me'?{user:{id:'1',displayName:'Yunus',email:'yunus@example.com',avatarUrl:null}}
      :path==='/api/hesap'?{business:{id:1,name:'Güzel Teknoloji'},user:{id:1,name:'Yunus',email:'yunus@example.com'},owner:true,permissions:WORKSPACE_RESOURCES.map(r=>({resource:r.key,read:true,save:true,delete:true}))}
      :path==='/api/hesap/roller'?[{id:1,name:'Mağaza Personeli',users:3,permissions:[{resource:'products',read:true,save:true,delete:false}]}]
      :path.startsWith('/api/hesap/ayarlar/')?{values:{host:'smtp.example.com',port:'587',username:'info@example.com'},configured:['password'],system:{smtp:true,google:true}}
      :[];
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  });
  await page.goto('/uygulama/roller');
  await expect(page.getByText('Mağaza Personeli',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Profil Menüsü',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'Profil Menüsü'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Çıkış Yap',exact:true})).toBeVisible();
  await page.screenshot({path:info.outputPath('profile-menu.png')});
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Mağaza Personeli düzenle'}).click();
  await expect(page.getByRole('checkbox',{name:'Ürünler Kaydet'})).toBeChecked();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.screenshot({path:info.outputPath('role-permissions.png')});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.getByRole('button',{name:'Kapat',exact:true}).click();
  await page.goto('/uygulama/ayarlar/smtp');
  await expect(page.getByLabel('Sunucu',{exact:true})).toHaveValue('smtp.example.com');
  await page.screenshot({path:info.outputPath('smtp-settings.png')});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
