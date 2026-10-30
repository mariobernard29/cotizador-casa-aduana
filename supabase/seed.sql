-- Generado por scripts/build-seed.ts a partir de supabase/seed/catalog.json. No editar a mano.
begin;

-- Configuración del negocio (datos de RECURSOS/DATOS Y VARIABLES.txt y casadelaaduana.com/eventos)
insert into public.business_settings (id, name, tagline, address, phone, email, email_verified, website, instagram, facebook,
  timezone, currency, tax_rate, tax_mode, event_start_time, event_end_time, min_lead_days, default_terms)
values (1, 'Casa Aduana', 'Hotel Boutique', 'Lázaro Cárdenas, C.P. 81377, Topolobampo, Sin., México', '+52 668 463 9069',
  'casadelaadana@grupofelix.com.mx', false, 'https://www.casadelaaduana.com', 'casaaduanatopo', 'casaaduanatopo',
  'America/Mazatlan', 'MXN', 0.16, 'included', '09:00', '23:30', 7,
  'Precios en pesos mexicanos (MXN) con IVA incluido.
Esta cotización no garantiza la disponibilidad de la fecha; la reserva queda firme únicamente cuando Casa Aduana la confirma por escrito.
Los eventos se organizan con al menos una semana de anticipación.
El horario de eventos es de 09:00 a 23:30 h.
La renta de la terraza es por 6 horas; las horas adicionales se cotizan por separado.')
on conflict (id) do nothing;

-- Espacios conocidos (capacidad pendiente)
insert into public.spaces (name, description, sort) values ('Terraza', 'Terraza del hotel. Renta base de 6 horas.', 1)
on conflict (name) do nothing;
update public.spaces set base_hours = 6 where name = 'Terraza' and base_hours is null;

-- Menú: Desayunos
insert into public.menus (slug, name, description, source_file, sort) values ('desayunos', 'Desayunos', 'Menú de desayunos 2026', 'Menú CA Desayunos 2026 - Menu V1.pdf', 1)
on conflict (slug) do nothing;
insert into public.categories (menu_id, name, sort) select id, 'Desayunos', 1 from public.menus where slug = 'desayunos'
on conflict (menu_id, name) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('waffles', 'Waffles', null, 'platillo', 'food', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, 'Compota de frutas y queso brie', 'Compota de frutas frescas de temporada, queso brie, queso crema batido y crunch de cereal.', 21000, 10
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Desayunos' join public.items i on i.slug = 'waffles'
 where m.slug = 'desayunos'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, 'Tocino caramelizado y queso de cabra', 'Tocino caramelizado, aguacate, queso de cabra y miel de abeja con chile quebrado.', 23000, 11
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Desayunos' join public.items i on i.slug = 'waffles'
 where m.slug = 'desayunos'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, 'Frutas y crema de cacahuate', 'Frutas frescas de temporada, crema de cacahuate casera, queso crema batido y semillas de hemp.', 19000, 12
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Desayunos' join public.items i on i.slug = 'waffles'
 where m.slug = 'desayunos'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('omelette-de-vegetales', 'Omelette de Vegetales', 'Relleno de vegetales salteados en aceite de curry, cubiertos en crema de tres quesos. Acompañado de ensalada de mini pimientos dulces y tomates cherry salteados en aceite de oliva.', 'platillo', 'food', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 23500, 20
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Desayunos' join public.items i on i.slug = 'omelette-de-vegetales'
 where m.slug = 'desayunos'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('huevos-hashbrowns', 'Huevos & Hashbrowns', 'Dos huevos estrellados sobre hashbrowns fritos con aceite de curry y cebolla, acompañados de una rebanada de pan sourdough y jocoque para untar.', 'platillo', 'food', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 23000, 30
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Desayunos' join public.items i on i.slug = 'huevos-hashbrowns'
 where m.slug = 'desayunos'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('hummus-toast', 'Hummus Toast', 'Dos huevos pochados sobre sourdough con hummus de betabel, queso cotija, aguacate y salsa macha. Acompañado de ensalada de mini pimientos dulces y tomates cherry salteados.', 'platillo', 'food', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 26500, 40
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Desayunos' join public.items i on i.slug = 'hummus-toast'
 where m.slug = 'desayunos'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('pan-frances', 'Pan Francés', 'Pan brioche casero con compota de frutos de temporada y crema batida, acompañado de miel de maple. Puedes elegir entre el clásico brioche de mantequilla o el brioche de chocolate.', 'platillo', 'food', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 25000, 50
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Desayunos' join public.items i on i.slug = 'pan-frances'
 where m.slug = 'desayunos'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('beet-pancakes', 'Beet Pancakes', 'Betabel, leche de almendras, aceite de coco, avena, banana, acompañado de fruta fresca y peanut butter hecha en casa.', 'platillo', 'food', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 22000, 60
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Desayunos' join public.items i on i.slug = 'beet-pancakes'
 where m.slug = 'desayunos'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('chilaquiles', 'Chilaquiles', 'Poblanos, Rojos o Verdes con frijoles, crema, aguacate, cilantro, queso y dos huevos estrellados.', 'platillo', 'food', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 25000, 70
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Desayunos' join public.items i on i.slug = 'chilaquiles'
 where m.slug = 'desayunos'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('huevos-montados', 'Huevos Montados', 'Dos huevos pochados sobre tortilla de maíz frita con frijoles, machaca, chile poblano, panela, salsa asada y aguacate.', 'platillo', 'food', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 26500, 80
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Desayunos' join public.items i on i.slug = 'huevos-montados'
 where m.slug = 'desayunos'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('especial-sinaloenses', 'Especial Sinaloenses', 'Huevos en torta, tamal de elote con queso crema del chef, bañado en salsa de frijol, chilorio de la casa, salsa verde y queso rancho.', 'platillo', 'food', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 34000, 90
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Desayunos' join public.items i on i.slug = 'especial-sinaloenses'
 where m.slug = 'desayunos'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('combinacion-sonorense', 'Combinación Sonorense', 'Machaca a la mexicana, huevo al gusto, tamal bañado en salsa poblana, chilaquiles y frijoles refritos.', 'platillo', 'food', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 34000, 100
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Desayunos' join public.items i on i.slug = 'combinacion-sonorense'
 where m.slug = 'desayunos'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('combinacion-sinaloense', 'Combinación Sinaloense', 'Chilorio con verdura, huevo al gusto, tamal bañado en salsa poblana, chilaquiles y frijoles refritos.', 'platillo', 'food', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 34000, 110
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Desayunos' join public.items i on i.slug = 'combinacion-sinaloense'
 where m.slug = 'desayunos'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('combinacion-regia', 'Combinación Regia', 'Filete de sirloin, huevo al gusto, tamal bañado en salsa poblana, chilaquiles y frijoles refritos.', 'platillo', 'food', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 34000, 120
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Desayunos' join public.items i on i.slug = 'combinacion-regia'
 where m.slug = 'desayunos'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('omelette-de-camaron', 'Omelette de Camarón', 'Omelette relleno de camarón ranchero y queso acompañado de chilaquiles y frijoles.', 'platillo', 'food', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 28500, 130
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Desayunos' join public.items i on i.slug = 'omelette-de-camaron'
 where m.slug = 'desayunos'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('hot-cakes-de-la-casa', 'Hot Cakes de la Casa', 'Hot cakes tradicionales acompañados de fruta fresca y miel de maple.', 'platillo', 'food', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 22500, 140
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Desayunos' join public.items i on i.slug = 'hot-cakes-de-la-casa'
 where m.slug = 'desayunos'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('avocado-toast', 'Avocado Toast', 'Pan artesanal tostado con aguacate fresco, jamón serrano, huevo, parmesano, arúgula y pimientos baby.', 'platillo', 'food', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 26500, 150
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Desayunos' join public.items i on i.slug = 'avocado-toast'
 where m.slug = 'desayunos'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.categories (menu_id, name, sort) select id, 'Extras', 2 from public.menus where slug = 'desayunos'
on conflict (menu_id, name) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('tocino-con-caramelo', 'Orden de tocino con caramelo', null, 'orden (3 pzas)', 'extra', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 6500, 10
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Extras' join public.items i on i.slug = 'tocino-con-caramelo'
 where m.slug = 'desayunos'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('papas-campesinas', 'Papas campesinas', null, 'orden', 'extra', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', 'Orden de papas campesinas', 7500, 20
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Extras' join public.items i on i.slug = 'papas-campesinas'
 where m.slug = 'desayunos'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('plato-de-frutas', 'Orden de plato de frutas', null, 'orden', 'extra', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 7500, 30
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Extras' join public.items i on i.slug = 'plato-de-frutas'
 where m.slug = 'desayunos'
on conflict (menu_id, item_id, variant_label) do nothing;

-- Menú: Marino Azul
insert into public.menus (slug, name, description, source_file, sort) values ('marino-azul', 'Marino Azul', 'Menú Marino Azul: entradas, platos fuertes, postres y bebidas', 'Casa Aduana — Menú Marino Azul VF 1.pdf', 2)
on conflict (slug) do nothing;
insert into public.categories (menu_id, name, sort) select id, 'Para compartir', 1 from public.menus where slug = 'marino-azul'
on conflict (menu_id, name) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('focaccia-artesanal', 'Focaccia Artesanal', 'Pan italiano horneado con aceite de oliva extra virgen, romero fresco, tomate deshidratado y sal de mar.', 'platillo', 'food', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 14900, 10
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Para compartir' join public.items i on i.slug = 'focaccia-artesanal'
 where m.slug = 'marino-azul'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('guacamole', 'Guacamole', 'Servido con pico de gallo, tostadas y cebolla cambray.', 'platillo', 'food', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 17500, 20
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Para compartir' join public.items i on i.slug = 'guacamole'
 where m.slug = 'marino-azul'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('coliflor-asada', 'Coliflor Asada', 'Crema de poro y coliflor, acompañada de alioli.', 'platillo', 'food', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 19000, 30
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Para compartir' join public.items i on i.slug = 'coliflor-asada'
 where m.slug = 'marino-azul'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.categories (menu_id, name, sort) select id, 'Entradas frescas', 2 from public.menus where slug = 'marino-azul'
on conflict (menu_id, name) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('ensalada-ejotes-mandarina-mango', 'Ensalada de ejotes, mandarina y mango', 'Ejotes, mandarina, mango, mix de lechuga orgánica, queso feta, nuez, vinagreta de miel y mostaza.', 'platillo', 'food', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 24500, 10
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Entradas frescas' join public.items i on i.slug = 'ensalada-ejotes-mandarina-mango'
 where m.slug = 'marino-azul'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('ensalada-betabel-duraznos', 'Ensalada de betabel y duraznos', 'Betabel rostizado, duraznos, mix de lechuga orgánica, jocoque, queso de cabra, nuez caramelizada y vinagreta Thai de mango.', 'platillo', 'food', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 28500, 20
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Entradas frescas' join public.items i on i.slug = 'ensalada-betabel-duraznos'
 where m.slug = 'marino-azul'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('ensalada-cesar-casa-aduana', 'Ensalada César Casa Aduana', 'Corazón de lechuga romana, pechuga de pollo, crotones de la casa, queso parmesano y aderezo César de la casa.', 'platillo', 'food', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 27500, 30
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Entradas frescas' join public.items i on i.slug = 'ensalada-cesar-casa-aduana'
 where m.slug = 'marino-azul'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('ceviche-de-sierra', 'Ceviche de sierra', 'Sierra 180 gr, limón, cebolla morada, aguacate, salsa negra de la casa y poro frito.', 'platillo', 'food', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 27500, 40
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Entradas frescas' join public.items i on i.slug = 'ceviche-de-sierra'
 where m.slug = 'marino-azul'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('ceviche-de-camaron', 'Ceviche de camarón', 'Camarón 180 gr, limón, cebolla morada y aguacate.', 'platillo', 'food', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 29500, 50
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Entradas frescas' join public.items i on i.slug = 'ceviche-de-camaron'
 where m.slug = 'marino-azul'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('chicharron-de-pescado', 'Chicharrón de pescado', 'Pesca del día 180 gr, mayonesa de chipotle, guacamole, salsa de habanero tatemado.', 'platillo', 'food', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 29000, 60
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Entradas frescas' join public.items i on i.slug = 'chicharron-de-pescado'
 where m.slug = 'marino-azul'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('tostada-tropical', 'Tostada tropical', 'Pescado del día 120 gr, aguacate, mango, salsa de soya y limón (2 pzas).', 'orden (2 pzas)', 'food', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 26500, 70
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Entradas frescas' join public.items i on i.slug = 'tostada-tropical'
 where m.slug = 'marino-azul'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.categories (menu_id, name, sort) select id, 'Platos fuertes', 3 from public.menus where slug = 'marino-azul'
on conflict (menu_id, name) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('hamburguesa-prime-aduana', 'Hamburguesa Prime Aduana', 'Prime Beef 200 gr, pan de la casa, tocino, cebolla confitada, alioli de pepinillo y papas waffle.', 'platillo', 'food', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 32000, 10
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Platos fuertes' join public.items i on i.slug = 'hamburguesa-prime-aduana'
 where m.slug = 'marino-azul'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('tacos-de-rib-eye', 'Tacos de Rib Eye', 'Rib eye 180 gr, tortilla azul hecha a mano, costra de queso, guacamole y salsa tatemada (2 pzas).', 'orden (2 pzas)', 'food', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 26000, 20
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Platos fuertes' join public.items i on i.slug = 'tacos-de-rib-eye'
 where m.slug = 'marino-azul'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('tacos-de-pork-belly', 'Tacos de Pork Belly', 'Pork belly, tortilla azul hecha a mano, coleslaw y guacamole (3 pzas).', 'orden (3 pzas)', 'food', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 24000, 30
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Platos fuertes' join public.items i on i.slug = 'tacos-de-pork-belly'
 where m.slug = 'marino-azul'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('sandwich-jamon-ahumado', 'Sándwich de jamón ahumado', 'Jamón ahumado 150 gr, baguette de la casa, tocino, cebolla confitada y papas waffle.', 'platillo', 'food', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 27500, 40
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Platos fuertes' join public.items i on i.slug = 'sandwich-jamon-ahumado'
 where m.slug = 'marino-azul'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('albondigas-de-camaron', 'Albóndigas de camarón', 'Servidas en caldo de chimole, acompañadas de arroz y tortillas hechas a mano.', 'platillo', 'food', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 29500, 50
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Platos fuertes' join public.items i on i.slug = 'albondigas-de-camaron'
 where m.slug = 'marino-azul'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('camarones-empanizados', 'Camarones empanizados', 'Camarón, panko, salsa de mango habanero y ensalada mixta orgánica (6 pzas).', 'orden (6 pzas)', 'food', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 32000, 60
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Platos fuertes' join public.items i on i.slug = 'camarones-empanizados'
 where m.slug = 'marino-azul'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('rib-eye', 'Rib Eye', 'Rib eye 350 gr. Acompañado de 2 guarniciones.', 'platillo', 'food', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 59000, 70
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Platos fuertes' join public.items i on i.slug = 'rib-eye'
 where m.slug = 'marino-azul'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('pulpo-zarandeado', 'Pulpo zarandeado', 'Pulpo 250 gr, adobo de la casa, crema de pesto, papas campesinas y focaccia.', 'platillo', 'food', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 42500, 80
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Platos fuertes' join public.items i on i.slug = 'pulpo-zarandeado'
 where m.slug = 'marino-azul'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('pasta-linguini-a-la-diabla', 'Pasta Linguini a la diabla', 'Camarones, pulpo, crema de chimole picante, queso parmesano y focaccia.', 'platillo', 'food', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 45000, 90
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Platos fuertes' join public.items i on i.slug = 'pasta-linguini-a-la-diabla'
 where m.slug = 'marino-azul'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('paella-casa-aduana', 'Paella Casa Aduana', 'Paella con mariscos, pollo y chorizo ibérico.', 'platillo', 'food', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 42000, 100
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Platos fuertes' join public.items i on i.slug = 'paella-casa-aduana'
 where m.slug = 'marino-azul'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.categories (menu_id, name, sort) select id, 'Guarniciones', 4 from public.menus where slug = 'marino-azul'
on conflict (menu_id, name) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('pure-de-papa', 'Puré de papa', null, 'orden', 'extra', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 7500, 10
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Guarniciones' join public.items i on i.slug = 'pure-de-papa'
 where m.slug = 'marino-azul'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('papas-campesinas', 'Papas campesinas', null, 'orden', 'extra', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', 'Papa campesina', 7500, 20
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Guarniciones' join public.items i on i.slug = 'papas-campesinas'
 where m.slug = 'marino-azul'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('mac-and-cheese', 'Mac and cheese', null, 'orden', 'extra', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 7500, 30
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Guarniciones' join public.items i on i.slug = 'mac-and-cheese'
 where m.slug = 'marino-azul'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('vegetales-salteados', 'Vegetales salteados', null, 'orden', 'extra', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 7500, 40
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Guarniciones' join public.items i on i.slug = 'vegetales-salteados'
 where m.slug = 'marino-azul'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('papa-al-horno', 'Papa al horno', null, 'orden', 'extra', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 7500, 50
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Guarniciones' join public.items i on i.slug = 'papa-al-horno'
 where m.slug = 'marino-azul'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('mix-chile-guero-cebolla-pimientos', 'Mix de chile güero, cebolla cambray y mini pimientos', null, 'orden', 'extra', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 7500, 60
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Guarniciones' join public.items i on i.slug = 'mix-chile-guero-cebolla-pimientos'
 where m.slug = 'marino-azul'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('zanahoria-confitada', 'Zanahoria confitada', null, 'orden', 'extra', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 7500, 70
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Guarniciones' join public.items i on i.slug = 'zanahoria-confitada'
 where m.slug = 'marino-azul'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.categories (menu_id, name, sort) select id, 'Postres', 5 from public.menus where slug = 'marino-azul'
on conflict (menu_id, name) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('tartara-de-frutas', 'Tártara de frutas', 'Fruta de temporada y crema pastelera.', 'postre', 'food', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 16000, 10
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Postres' join public.items i on i.slug = 'tartara-de-frutas'
 where m.slug = 'marino-azul'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('el-tesoro-de-la-aduana', 'El Tesoro de la Aduana', 'Galleta de choco chips, helado de mazapán.', 'postre', 'food', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 17500, 20
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Postres' join public.items i on i.slug = 'el-tesoro-de-la-aduana'
 where m.slug = 'marino-azul'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('pay-de-limon', 'Pay de limón', 'Base de galleta con crema de limón fresco y merengue quemado.', 'postre', 'food', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 17000, 30
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Postres' join public.items i on i.slug = 'pay-de-limon'
 where m.slug = 'marino-azul'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('pera-pochada', 'Pera Pochada', 'Pera pochada en vino tinto con galleta de pistacho.', 'postre', 'food', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 19500, 40
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Postres' join public.items i on i.slug = 'pera-pochada'
 where m.slug = 'marino-azul'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.categories (menu_id, name, sort) select id, 'Mixología de la casa', 6 from public.menus where slug = 'marino-azul'
on conflict (menu_id, name) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('coctel-la-aduana', 'La Aduana', 'Mezcal Espadín, Ancho Reyes, piña, limón y miel de agave. Ahumado, tropical y ligeramente picante.', 'bebida', 'drink', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 18500, 10
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Mixología de la casa' join public.items i on i.slug = 'coctel-la-aduana'
 where m.slug = 'marino-azul'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('topolobampo-sunset', 'Topolobampo Sunset', 'Tequila reposado, Aperol, naranja fresca, limón y agua mineral. Refrescante, cítrico y ligeramente amargo.', 'bebida', 'drink', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 18000, 20
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Mixología de la casa' join public.items i on i.slug = 'topolobampo-sunset'
 where m.slug = 'marino-azul'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('tierra-y-mango', 'Tierra y Mango', 'Mezcal, mango y limón, servido con escarcha de Tajín. Dulce, tropical y con un delicado toque ahumado.', 'bebida', 'drink', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 17500, 30
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Mixología de la casa' join public.items i on i.slug = 'tierra-y-mango'
 where m.slug = 'marino-azul'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('pasion-mezcalera', 'Pasión Mezcalera', 'Mezcal, maracuyá, limón y miel de agave. Exótico, vibrante y con el equilibrio perfecto entre acidez y dulzor.', 'bebida', 'drink', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 17500, 40
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Mixología de la casa' join public.items i on i.slug = 'pasion-mezcalera'
 where m.slug = 'marino-azul'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('agua-mala', 'Agua Mala', 'Tequila reposado, jamaica, limón y miel de agave, terminado con romero ahumado. Floral, cítrico y ligeramente ahumado.', 'bebida', 'drink', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 18500, 50
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Mixología de la casa' join public.items i on i.slug = 'agua-mala'
 where m.slug = 'marino-azul'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('citrico-del-puerto', 'Cítrico del Puerto', 'Vodka, licor de naranja, toronja, limón y agua mineral. Ligero, cítrico y refrescante.', 'bebida', 'drink', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 17500, 60
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Mixología de la casa' join public.items i on i.slug = 'citrico-del-puerto'
 where m.slug = 'marino-azul'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('marea-negra', 'Marea Negra', 'Mezcal, cold brew, licor de café y licor de cacao. Intenso, elegante y ahumado.', 'bebida', 'drink', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 19000, 70
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Mixología de la casa' join public.items i on i.slug = 'marea-negra'
 where m.slug = 'marino-azul'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('gin-de-los-mochis', 'Gin de Los Mochis', 'Gin, pepino fresco, limón, agua tónica y romero. Ligero, herbal y muy refrescante.', 'bebida', 'drink', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 17500, 80
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Mixología de la casa' join public.items i on i.slug = 'gin-de-los-mochis'
 where m.slug = 'marino-azul'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('carajillo-de-coco', 'Carajillo de Coco', 'Licor 43, espresso y crema de coco, terminado con coco tostado. Cremoso, dulce y perfecto para la sobremesa.', 'bebida', 'drink', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 18500, 90
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Mixología de la casa' join public.items i on i.slug = 'carajillo-de-coco'
 where m.slug = 'marino-azul'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('guanabana-spritz', 'Guanábana Spritz', 'Tequila blanco, guanábana, limón, Prosecco y agua mineral. Tropical, fresco y delicadamente burbujeante.', 'bebida', 'drink', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 19000, 100
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Mixología de la casa' join public.items i on i.slug = 'guanabana-spritz'
 where m.slug = 'marino-azul'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.categories (menu_id, name, sort) select id, 'Coctelería clásica', 7 from public.menus where slug = 'marino-azul'
on conflict (menu_id, name) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('gin-tonic', 'Gin Tonic', null, 'bebida', 'drink', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 17500, 10
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Coctelería clásica' join public.items i on i.slug = 'gin-tonic'
 where m.slug = 'marino-azul'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('margarita', 'Margarita', null, 'bebida', 'drink', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 15000, 20
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Coctelería clásica' join public.items i on i.slug = 'margarita'
 where m.slug = 'marino-azul'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('mezcalita-de-jamaica', 'Mezcalita de Jamaica', null, 'bebida', 'drink', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 16500, 30
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Coctelería clásica' join public.items i on i.slug = 'mezcalita-de-jamaica'
 where m.slug = 'marino-azul'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('mezcalindo', 'Mezcalindo', null, 'bebida', 'drink', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 16500, 40
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Coctelería clásica' join public.items i on i.slug = 'mezcalindo'
 where m.slug = 'marino-azul'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('mezcalita-de-maracuya', 'Mezcalita de Maracuyá', null, 'bebida', 'drink', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 17500, 50
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Coctelería clásica' join public.items i on i.slug = 'mezcalita-de-maracuya'
 where m.slug = 'marino-azul'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('carajillo', 'Carajillo', null, 'bebida', 'drink', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 17000, 60
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Coctelería clásica' join public.items i on i.slug = 'carajillo'
 where m.slug = 'marino-azul'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('hugo-spritz', 'Hugo Spritz', null, 'bebida', 'drink', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 20000, 70
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Coctelería clásica' join public.items i on i.slug = 'hugo-spritz'
 where m.slug = 'marino-azul'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('mimosa', 'Mimosa', null, 'bebida', 'drink', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 10000, 80
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Coctelería clásica' join public.items i on i.slug = 'mimosa'
 where m.slug = 'marino-azul'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.categories (menu_id, name, sort) select id, 'Bebidas', 8 from public.menus where slug = 'marino-azul'
on conflict (menu_id, name) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('limonada', 'Limonada', 'Natural, fresa o maracuyá.', 'bebida', 'drink', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 9000, 10
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Bebidas' join public.items i on i.slug = 'limonada'
 where m.slug = 'marino-azul'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('refresco', 'Refresco', null, 'bebida', 'drink', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 4000, 20
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Bebidas' join public.items i on i.slug = 'refresco'
 where m.slug = 'marino-azul'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.categories (menu_id, name, sort) select id, 'Cervezas', 9 from public.menus where slug = 'marino-azul'
on conflict (menu_id, name) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('cerveza-pacifico', 'Pacífico', null, 'cerveza', 'drink', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 5500, 10
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Cervezas' join public.items i on i.slug = 'cerveza-pacifico'
 where m.slug = 'marino-azul'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('cerveza-corona-extra', 'Corona Extra', null, 'cerveza', 'drink', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 5500, 20
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Cervezas' join public.items i on i.slug = 'cerveza-corona-extra'
 where m.slug = 'marino-azul'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('cerveza-modelo-especial', 'Modelo Especial', null, 'cerveza', 'drink', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 6000, 30
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Cervezas' join public.items i on i.slug = 'cerveza-modelo-especial'
 where m.slug = 'marino-azul'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('cerveza-negra-modelo', 'Negra Modelo', null, 'cerveza', 'drink', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 6500, 40
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Cervezas' join public.items i on i.slug = 'cerveza-negra-modelo'
 where m.slug = 'marino-azul'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('preparacion-chelada', 'Chelada (preparación)', 'Limón, sal y cerveza de tu elección. El costo de la preparación se agrega al precio de la cerveza seleccionada.', 'preparación', 'modifier', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 1500, 50
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Cervezas' join public.items i on i.slug = 'preparacion-chelada'
 where m.slug = 'marino-azul'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('preparacion-michelada', 'Michelada (preparación)', 'Clamato, limón, salsas de la casa y escarcha de Tajín. El costo de la preparación se agrega al precio de la cerveza seleccionada.', 'preparación', 'modifier', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 3000, 60
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Cervezas' join public.items i on i.slug = 'preparacion-michelada'
 where m.slug = 'marino-azul'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('preparacion-cubana', 'Cubana (preparación)', 'Limón, salsa inglesa, Maggi, salsa picante y escarcha de sal. El costo de la preparación se agrega al precio de la cerveza seleccionada.', 'preparación', 'modifier', false, null, 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, 2500, 70
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Cervezas' join public.items i on i.slug = 'preparacion-cubana'
 where m.slug = 'marino-azul'
on conflict (menu_id, item_id, variant_label) do nothing;

-- Menú: Servicios para eventos
insert into public.menus (slug, name, description, source_file, sort) values ('servicios', 'Servicios para eventos', 'Conceptos de renta y servicios. Los precios no vienen en los recursos: completar antes de cotizar.', 'casadelaaduana.com/eventos', 3)
on conflict (slug) do nothing;
insert into public.categories (menu_id, name, sort) select id, 'Renta de espacios', 1 from public.menus where slug = 'servicios'
on conflict (menu_id, name) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('renta-terraza-6-horas', 'Renta de terraza (6 horas)', null, 'evento', 'service', true, 'Precio no disponible en los recursos. El sitio indica que la renta de la terraza es por 6 horas.', 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, null, 10
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Renta de espacios' join public.items i on i.slug = 'renta-terraza-6-horas'
 where m.slug = 'servicios'
on conflict (menu_id, item_id, variant_label) do nothing;
insert into public.items (slug, name, description, unit, kind, needs_review, review_note, source) values ('hora-extra-terraza', 'Hora extra de terraza', null, 'hora', 'service', true, 'Precio no disponible en los recursos. El sitio indica que se puede pagar hora extra.', 'import')
on conflict (slug) do nothing;
insert into public.menu_item_prices (menu_id, item_id, category_id, variant_label, description, price_cents, sort)
select m.id, i.id, c.id, '', null, null, 20
  from public.menus m join public.categories c on c.menu_id = m.id and c.name = 'Renta de espacios' join public.items i on i.slug = 'hora-extra-terraza'
 where m.slug = 'servicios'
on conflict (menu_id, item_id, variant_label) do nothing;

commit;
