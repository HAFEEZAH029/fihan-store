-- Starter catalogue prices are USD cents. Replace these image paths with the final product assets.
insert into public.products (slug, name, category, description, price_cents, image_url, sizes, color)
values
  ('ameera-embroidered-abaya', 'Ameera Embroidered Abaya', 'abayas', 'A flowing espresso abaya with delicate embroidered details and a relaxed silhouette.', 18500, '/images/ameera-abaya.jpg', array['S', 'M', 'L', 'XL'], 'Espresso'),
  ('layla-silk-sand-abaya', 'Layla Silk Sand Abaya', 'abayas', 'A softly draped sand abaya, finished with understated detailing for everyday elegance.', 21000, '/images/layla-abaya.jpg', array['S', 'M', 'L', 'XL'], 'Sand'),
  ('hana-cotton-abaya', 'Hana Cotton Abaya', 'abayas', 'A breathable cotton abaya in a warm earth tone with a graceful, easy fit.', 16500, '/images/hana-abaya.jpg', array['S', 'M', 'L', 'XL'], 'Mocha'),
  ('lale-pleated-hijab', 'Lale Pleated Hijab', 'hijabs', 'A lightweight pleated hijab with a soft finish and effortless drape.', 3800, '/images/lale-hijab.jpg', array['One Size'], 'Latte'),
  ('pearl-artisanal-hijab', 'Pearl Artisanal Hijab', 'hijabs', 'A smooth, soft hijab with a subtle sheen and versatile styling.', 4500, '/images/pearl-hijab.jpg', array['One Size'], 'Pearl'),
  ('noor-cotton-hijab', 'Noor Cotton Hijab', 'hijabs', 'A breathable cotton hijab with a comfortable texture for daily wear.', 3200, '/images/noor-hijab.jpg', array['One Size'], 'Olive')
on conflict (slug) do nothing;
