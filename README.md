# Balanças

Aplicação estática para consulta e cadastro de balanças, com cartões QR Code de 86 × 54 mm.

Site: https://alexandrekoenich.github.io/balancas/

O cadastro usa Supabase Auth. Para habilitar os estados Ativa, Inativa e Em manutenção, além da edição das balanças, execute `supabase-situacao.sql` no SQL Editor do Supabase depois de substituir o UUID indicado pelo ID da conta autorizada. O script também configura as políticas de cadastro e edição. O código de cada balança fica fixo para preservar os QR Codes já impressos. Para recuperação de senha, adicione `https://alexandrekoenich.github.io/balancas/cadastro.html` às Redirect URLs do Supabase.

Para testar localmente, execute `python -m http.server 8000` nesta pasta e abra `http://localhost:8000/`.
