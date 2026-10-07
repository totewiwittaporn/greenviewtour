-- New Production configuration from owner-approved public contact details, not Local import.
-- Fresh CompanySettings only; never replace or overwrite an existing company.
INSERT INTO CompanySettings(id,name,phone,email,lineId,instagramUrl,updatedAt)
SELECT '20a1d214-2e11-4bb1-9c32-efee93b81d99','Greenview Tour','+66954266847',NULL,'@greenviewtour','https://www.instagram.com/greenviewtour/',strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE NOT EXISTS (SELECT 1 FROM CompanySettings);
