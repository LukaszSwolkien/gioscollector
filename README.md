### Quick summary ###

Data collector to read from GIOS servers (Główny Inspektorat Ochrony Środowiska)


### How do I get set up? ###

`npm install`

#### Configuration:

check `config.js` to set correct configuration

#### Dependencies:

`rxjs`
`mqtt`
`node-fetch`

#### Deployment instructions

`npm install`

`chmod +x app.js`

then register `csa.gioscollector.service` in systemd:

`cp /var/dev/gioscollector/csa.gioscollecor.service /etc/systemd/system`

`systemctl enable csa.gioscollecor.service`