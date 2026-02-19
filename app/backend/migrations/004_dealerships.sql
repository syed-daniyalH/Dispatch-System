-- Migration 004: Dealerships module (schema + seed from dealership export CSV)

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS dealerships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    city TEXT,
    postal_code TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT dealerships_status_chk CHECK (status IN ('active', 'inactive'))
);

DROP TRIGGER IF EXISTS update_dealerships_updated_at ON dealerships;
CREATE TRIGGER update_dealerships_updated_at
BEFORE UPDATE ON dealerships
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_dealerships_status ON dealerships(status);
CREATE INDEX IF NOT EXISTS idx_dealerships_name ON dealerships(name);

INSERT INTO dealerships (
    code,
    name,
    phone,
    email,
    address,
    city,
    postal_code,
    status,
    notes
)
VALUES
    ('D-001', 'D-001', '+1(418) 655-8309', NULL, NULL, NULL, NULL, 'active', NULL),
    ('D-002', '911 Pro', '+1(514) 893-0911', 'comptabilite@911pro.com', '1240 Rue Labelle', 'Longueuil', 'J4N 1C7', 'active', NULL),
    ('D-003', 'Agropur', '+1(421) 007-1863', 'factures.invoices@agropur.com', NULL, NULL, NULL, 'active', NULL),
    ('D-004', 'System Test', '+1(418) 655-8309', 'alexdesgagne@hotmail.com', '123 Test Drive', 'Quebec', 'G1G 1G1', 'active', NULL),
    ('D-005', 'Audi De Quebec', '+1(581) 705-8089', 'comptabilite@audidequebec.com, jvilleneuve@audidequebec.com', '5200 Rue John Molson', 'Quebec', 'G1X 3X4', 'active', NULL),
    ('D-006', 'Audi Levis', '+1(581) 500-6545', NULL, NULL, NULL, NULL, 'active', NULL),
    ('D-007', 'Carrossier Procolor Portneuf', '+1(418) 286-2323', 'portneuf@carrossierprocolor.com', '140 Lucien-Thibodeau', 'Portneuf', 'G0A 2Y0', 'active', NULL),
    ('D-008', 'Clinique Dentaire Marchand Charest Dumas', '+1(418) 654-9123', 'julie.clinique@outlook.com', '2850 Chem. Saint-Louis', 'Quebec', 'G1W 1P2', 'active', NULL),
    ('D-009', 'Germain Nissan Donnacona', '+1(418) 285-0970', 'dthibault@germainnissan.ca', '104 Rue Commerciale', 'Donnacona', 'G3M 1W1', 'active', NULL),
    ('D-010', 'Donnacona Chrysler Jeep Dodge Ram', NULL, NULL, '160 Rue Commerciale', 'Donnacona', 'G3M 1W1', 'active', NULL),
    ('D-011', 'Donnacona Ford', NULL, NULL, '128 Bd Les Ecureuils', 'Donnacona', 'G3M 0J2', 'active', NULL),
    ('D-012', 'Donnacona Mazda', '41852852020', 'aprovost@donnaconamazda.com', '141 Rue Commerciale', 'Donnacona', 'G3M 1W2', 'active', NULL),
    ('D-013', 'Germain Chevrolet Buick Gmc', NULL, NULL, '560 Cote Joyeuse', 'Saint-Raymond', 'G3L 4B1', 'active', NULL),
    ('D-014', 'Germain Nissan Donnacona', NULL, NULL, '104 Rue Commerciale', 'Donnacona', 'G3M 1W1', 'active', NULL),
    ('D-015', 'Honda Donnacona', NULL, NULL, '159 Rue Commerciale', 'Donnacona', 'G3M 1W2', 'active', NULL),
    ('D-016', 'Hyundai Saint-Raymond', NULL, NULL, '484 Cote Joyeuse', 'Saint-Raymond', 'G3L 4A7', 'active', NULL),
    ('D-017', 'Kia Cap-Sante', '+1(418) 285-5555', 'dhuard@leprixdugros.com', '5 Bois De L Ail', 'Cap-Sante', 'G0A 1L0', 'active', NULL),
    ('D-018', 'Kia Cap-Sante', NULL, NULL, '5 Chem. Du Bois De L''Ail', 'Cap-Sante', 'G0A 1L0', 'active', NULL),
    ('D-019', 'L''Expert Carrossier Rive-Sud', NULL, 'magasinierauto@corrossier.expert, adjointe@carrossier.expert, philippe.denoncourt@carrossier.expert', '250 Av. Taniata', 'Levis', 'G6W 5M6', 'active', NULL),
    ('D-020', 'Agropur/Natrel', NULL, NULL, '2465 1 Ere Avenue', 'Quebec', 'G1L 3M9', 'active', NULL),
    ('D-021', 'Mag3', '+1(418) 849-6919', 'payable@sm-inc.com', '15971, Boul. De La Colline', 'Quebec', 'G3G 3A7', 'active', NULL),
    ('D-022', 'Ville De Quebec', NULL, 'karyne.legere@ville.quebec.qc.ca', NULL, NULL, NULL, 'active', NULL),
    ('D-023', 'Pagui', '+1(418) 849-7104', 'payable@sm-inc.com', '15971 Bd De La Colline', 'Quebec', 'G3G 3A7', 'active', NULL),
    ('D-024', 'Pg Solutions', NULL, 'cp@harriscomputer.com, rrutishauser@pgsolutions.com', '217 avenue Leonidas #13', 'Rimouski', 'G5L 2T5', 'active', NULL),
    ('D-025', 'Prest', '+1(418) 559-1535', 'admin@prest.ltd', '1550 Ave Diesel,', 'Quebec', 'G1P 4J5', 'active', NULL),
    ('D-026', 'Pro-Design', '+1(418) 284-8894', 'victorplamondon@videotron.ca', NULL, NULL, NULL, 'active', NULL),
    ('D-027', 'Remorquage Charles Parent', '+1(418) 928-1797', 'parent.charles@videotron.ca', '1443 St Olivier', 'Ancienne Lorette', 'G2E 2N7', 'active', NULL),
    ('D-028', 'Revenu Canada', NULL, NULL, NULL, NULL, NULL, 'active', NULL),
    ('D-029', 'Serge Fontaine', NULL, NULL, NULL, NULL, NULL, 'active', NULL),
    ('D-030', 'Services Mobiles Martin Després Inc.', '+1(418) 998-4458', 'martin.despres.83@gmail.com', '527 Rue Taschereau,', 'Quebec City', 'G3G 1B4', 'active', NULL),
    ('D-031', 'Sm Construction Inc', '+1(418) 849-7104', 'payable@sm-inc.com', '15971, Boul. De La Colline', 'Quebec', 'G3G 3A7', 'active', NULL),
    ('D-032', 'Solutech Gps', '1888765', 'facturation@solutechgps.com', '308 Chemin De La Traverse', 'Sainte-Anne-des-Plaines', 'J6Y 1S9', 'active', NULL),
    ('D-033', 'Services Sanitaire A.Deschesnes', NULL, 'ssad-inc@live.ca', '600 Chemin Riviere-Verte', 'St-Antonin', 'G0L 2J0', 'active', NULL),
    ('D-034', 'St-Raymond Toyota', NULL, NULL, '565 Cote Joyeuse', 'Saint-Raymond', 'G3L 4B2', 'active', NULL),
    ('D-035', 'Tardif Métal Inc', NULL, 'payable@sm-inc.com', '15971, Boul. De La Colline', 'Quebec', 'G3G 3A7', 'active', NULL),
    ('D-036', 'Transport Guilmyr', NULL, 'Karl.martin@gilmyr.com', '315 Chemin Du Coteau', 'Montmagny', 'G5V 3R8', 'active', NULL),
    ('D-037', 'Ville De Quebec  Service De Finance', NULL, 'Karyne.legere@ville.quebec.qc.ca', '65 Rue Sainte-Anne,R-C', 'Quebec', 'G1R 3X5', 'active', NULL),
    ('D-038', 'Vitroplus Ste-Foy', '+1(418) 650-6996', 'service@vpsf.info', '2866 Chemin St Louis', 'Quebec', 'G1W 1P4', 'active', NULL)
ON CONFLICT (code) DO UPDATE
SET
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    postal_code = EXCLUDED.postal_code,
    status = EXCLUDED.status,
    notes = EXCLUDED.notes,
    updated_at = NOW();

COMMIT;
