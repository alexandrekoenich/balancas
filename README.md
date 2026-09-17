# Balanças

Aplicação estática para consulta e cadastro de balanças, com cartões QR Code de 86 × 54 mm.

Site: https://alexandrekoenich.github.io/balancas/

O cadastro usa Supabase Auth e requer uma política de `INSERT` para o usuário autorizado. O arquivo `supabase-cadastro.sql` contém o modelo da política; substitua o UUID indicado antes de executá-lo. Para recuperação de senha, adicione `https://alexandrekoenich.github.io/balancas/cadastro.html` às Redirect URLs do Supabase.

Para testar localmente, execute `python -m http.server 8000` nesta pasta e abra `http://localhost:8000/`.
