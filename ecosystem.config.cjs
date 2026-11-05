/**
 * PM2 yapılandırması (CloudPanel / Linux sunucu).
 * Kullanım (proje kök klasöründe, site kullanıcısıyla):
 *   pm2 start ecosystem.config.cjs
 *   pm2 save
 *
 * Gizli değerler BURAYA yazılmaz; kök dizindeki .env dosyasından okunur (Node --env-file).
 */
module.exports = {
  apps: [
    {
      name: 'guzel-auth',
      cwd: './apps/api',
      script: 'dist/server.js',
      // .env dosyası yoksa uygulama başlamaz (bilerek): eksik yapılandırma sessizce geçilmez.
      node_args: '--env-file=../../.env',
      // Tek süreç: hız sınırlayıcı bellek içindir; cluster modu için paylaşımlı depo gerekir.
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 3000,
      max_memory_restart: '400M',
      kill_timeout: 8000,
      time: true,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
