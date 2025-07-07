-- Clean up mock eBay account and prepare for real OAuth
DELETE FROM marketplace_accounts 
WHERE platform = 'ebay' 
AND account_username = 'ebay_user' 
AND oauth_token LIKE 'v^1.1#i^1#I^3%';