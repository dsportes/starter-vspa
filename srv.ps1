$cert = "../asocial2-srv/cert/"
$domain = "test.sportes.fr"
npx http-server . -p 8098 --cors -c-1 -S -C "$cert/fullchain.pem" -K "$cert/privkey.pem" -a $domain
