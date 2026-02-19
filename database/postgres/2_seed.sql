INSERT INTO users (first_name, last_name, phone, email, address, password_hash, role) VALUES
('Admin','Root','0600000000','admin@vitegourmand.fr','Bordeaux','__BOOTSTRAP__','admin'),
('Employe','Test','0611111111','employe@vitegourmand.fr','Bordeaux','__BOOTSTRAP__','employe'),
('User','Test','0622222222','user@test.fr','Bordeaux','__BOOTSTRAP__','user')
ON CONFLICT (email) DO NOTHING;

INSERT INTO allergens (name) VALUES
('gluten'),('lait'),('oeuf'),('arachide'),('soja'),('poisson'),('crustacés'),('fruits à coque')
ON CONFLICT (name) DO NOTHING;

INSERT INTO dishes (name, dish_type, description) VALUES
('Salade de saison','entree','Fraîche et légère'),
('Velouté de potimarron','entree','Crème, épices douces'),
('Bœuf bourguignon','plat','Tradition bordelaise'),
('Lasagnes végétariennes','plat','Légumes, ricotta'),
('Tarte aux pommes','dessert','Caramélisée'),
('Mousse au chocolat','dessert','Chocolat noir intense');

INSERT INTO dish_allergens (dish_id, allergen_id)
SELECT d.id, a.id FROM dishes d, allergens a
WHERE (d.name='Lasagnes végétariennes' AND a.name IN ('gluten','lait','oeuf'))
ON CONFLICT DO NOTHING;

INSERT INTO menus (title, description, theme, regime, conditions, min_people, base_price, stock, gallery) VALUES
('Menu Classique', 'Entrée + plat + dessert au choix.', 'classique', 'classique',
 'Commander au minimum 72h avant la prestation. Conserver au frais.', 4, 25.00, 10,
 '["/assets/menu-classique-1.jpg","/assets/menu-classique-2.jpg"]'),
('Menu Noël', 'Menu spécial fêtes, produits premium.', 'noel', 'classique',
 'Commander au minimum 10 jours avant. Chaîne du froid obligatoire.', 6, 35.00, 5,
 '["/assets/menu-noel-1.jpg"]'),
('Menu Vegan', 'Menu 100% végétal.', 'evenement', 'vegan',
 'Commander 5 jours avant. Allergènes possibles selon options.', 4, 28.00, 8,
 '["/assets/menu-vegan-1.jpg"]')
ON CONFLICT DO NOTHING;

INSERT INTO menu_dishes (menu_id, dish_id)
SELECT m.id, d.id FROM menus m, dishes d
WHERE (m.title='Menu Classique' AND d.name IN ('Salade de saison','Bœuf bourguignon','Tarte aux pommes'))
   OR (m.title='Menu Noël' AND d.name IN ('Velouté de potimarron','Bœuf bourguignon','Mousse au chocolat'))
   OR (m.title='Menu Vegan' AND d.name IN ('Salade de saison','Lasagnes végétariennes','Tarte aux pommes'))
ON CONFLICT DO NOTHING;
