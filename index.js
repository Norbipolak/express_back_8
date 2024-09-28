import express from "express";
import expressEjsLayouts from "express-ejs-layouts";
import UserHandler from "./app/userHandler,js"; 
import session from "express-session"
import successHTTP from "./app/successHTTP.js";
import Addresses from "./app/Addresses.js";
import getMessageAndSuccess from "./app/getMessageAndSuccess.js";
import checkPermission from "./app/checkPermission.js";

const app = express();

app.set("view engine", "ejs");
app.use(expressEjsLayouts);
app.use(urlencoded({extended: true}));
app.use(express.static("assets"));

app.use(session());

app.use(session({
    secret: "asdf",
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 24*60*60*1000
    }
}));

const uh = new UserHandler();
const p = new Profile(); 
const a = new Addresses();

app.get("/", (req, res)=> {
    res.render("public/index", 
        {
            layout: "layouts/public_layout", 
            title: "Kezdőlap", 
            page:"index",
            message:req.query.message ? req.query.message : ""
        }
    );
});

app.post("/regisztracio", async (req, res)=> {
    let response;
    try {
        response = await uh.register(req.body); 
    } catch (err) {
        response = err;
    }

    //response.success = response.status.toString(0) === "2";
    response.success = successHTTP(response.status);
    res.status(response.status);

    res.render("public/register_post", {
        layout: "./layout/public_layout",
        message: response.message,
        title: "Regisztráció",
        page: "regisztracio", 
        success: response.success
    })
});

app.post("/login", async (req, res)=> {
    let response;
    let path;

    try{
        response = uh.login(req.body);
        req.session.userName = response.userName;
        req.session.userID = response.userID;

        path = response.message.isAdmin == 0 ? "/user/profil" : "/admin/profil"
    } catch(err) {
        response = err;
    }

    response.success = successHTTP(response.status);


    res.status(response.status).redirect(
        response.success ? path : `/bejelentkezes?message=${response.message[0]}`
    )

})

app.get("/bejelentkezes", (req, res)=> {
    res.render("public/login", {
        layout: "./layouts/public_layout",
        title: "Bejelentkezés",
        page: "bejelentkezes",
        message: req.query.message ? req.query.message : ""
    })
});

app.get("/user/profil", async (req, res)=> {
    try {
        checkPermission(req.session.userID);
        const profileData = await p.getProfile(req.session.userID);
        //const messages = req.query.messages.split(",");
        /*
            Mert a getProfile függvény vár egy id-t és az alapján lehozza az összes (*) adatot, ahhoz az id-ű rekordhoz 
        */
        //csináltunk egy segédfüggvényt
        const messageAndSuccess = getMessageAndSuccess(req.query);
        
        res.render("private/profile", {
            layout: "./layouts/user_layout",
            title: "Profil Szerkesztése",
            profileData: profileData.message, //itt meg megszerezzük az összes mezőt az adatbázisból 
            page: "profil", 
            message: messageAndSuccess.message,
            success: messageAndSuccess.success
        })
    } catch(err) {
        res.redirect(`/?message=${err.message}`);
    }   
});

app.post("/user/profil", async (req, res)=> {
    let response;

    try {
        const user = req.body;
        user.userID = req.session.userID;
        response = await p.updateProfile(user);
    } catch(err) {
        response = err;
    }

    console.log(response);

        
    const success = successHTTP(response.status);
    res.redirect(`/user/profil?success=${success}&messages=${response.message}`);
});

app.get("/user/cim-letrehozasa", async (req, res)=> {
    try {
        checkPermission(req.session.userID);
        const addressTypes = await a.getAddressTypes();
        const messageAndSuccess = getMessageAndSuccess(req.query);
    
        res.render("user/create_address", {
            layout: "./layouts/user_layout", 
            title: "Címek létrehozása", 
            page: "címek",
            addressTypes: addressTypes,
            message: messageAndSuccess.message,
            success: messageAndSuccess.success
        })
    } catch(err) {
        res.redirect(`/?message=${err.message}`);
    } 
   
});

app.post("/user/create_address", async (req, res)=> {
    //itt szedjük majd le az adatokat 
    let response;

    try {
        response = await a.createAddress(req.body, req.session.userID);
    } catch(err) {
        response = err;
    }

    const success = successHTTP(response.status);

    if(success) {
        res.status(response.status).redirect(`/user/cim-letrehozasa/${response.insertID}?message=${response.message}&success=${success}`);
    } else {
        res.status(response.status).redirect(`/user/cim-letrehozasa?message=${response.message}&success=${success}`);
    }
    
});

app.get("/user/cim-letrehozasa:addressID", async (req, res)=> {
    try {
        checkPermission(req.session.userID);
        const addressTypes = await a.getAddressTypes();
        const messageAndSuccess = getMessageAndSuccess(req.query);
    
        res.render("user/create_address", {
            layout: "./layouts/user_layout", 
            title: "Címek létrehozása", 
            page: "címek",
            addressTypes: addressTypes,
            message: messageAndSuccess.message,
            success: messageAndSuccess.success
        })
    } catch(err) {
        res.redirect(`/?message=${err.message}`);
    } 
   
});

app.get("/user/címek", async (req, res)=> {
    let response;

    try {
        checkPermission(req.session.userID),
        response = await a.getAddressesByUser(req.session.userID);
    } catch(err) {
        if(err.status === 403) {
            res.redirect(`/message=${err.message}`);
        }
        response = err;
    }

    res.render("user/addresses", { 
        layout: ".layout/user_layout",
        addresses: response.message,
        title: "Címek", 
        page: "címek"
    })
});

app.listen(3000, console.log("the app is listening on localhost:3000"));

/*
Az elöbb is úgy csináltuk, hogy a POST-ra átírányítottunk utána meg vissza 
<form class="box" method="POST" action="/addresses">
és erre csinálunk majd egy POST-ot, ahol lesz majd egy redirect 

try {
    response = await a.createAddress()
és itt két dolog van amit várunk az Adresses.js-en 
-> 
async createAddress(address, userID) { az adatok a formból (req.body) és az id a session-ből (req.session.userID)

response = await a.createAddress(req.body, req.session.userID);
És azért nem tudjuk majd megcsináklni, ha nem vagyunk bejelentkezve, mert a userID csak akkor van meg a session-ben, hogyha bejelentkeztünk 

redirect-elünk és attól függ, hogy mi a status 
    const success = successHTTP(response.status);
    res.status(response.status).redirect();

És azt kell a redirect-ben, hogy a címekre redirect-elünk, ahol van egy message és egy success-ünk 
res.status(response.status).redirect(`/címek?message=${response.message}&success=${success}`);
És attól függ, hogy milyen színnel lesz kiírva a message, hogy itt -> successHTTP(response.status) sikerült-e minden és 200-as hibakódot kapunk 
vagy nem 

És ha nem töltünk ki semmit a form-ban és úgy küldjük, akkor megjelennek az err a message-ben (URL-ben) és mi ezeket ki akarjuk írni 
végigmegyünk egy forEach-vel rajtuk, úgy mint a profile.ejs-ben!!! 
->
    <% message.forEach((m)=> {%>
        <h4 class="<%=success ? 'color-success' : 'color-error'%>">
            <%=m%>
        </h4>
    <% }); %>

és kiírja, hogy message is not defined, mert amikor csináltuk a get-es kéréses /címeket
->
app.get("/címek", async (req, res)=> {
    const addressTypes = await a.getAddressTypes();
    console.log(req.session.userID);

    res.render("user/addresses", {
        layout: "./layouts/private_layout", 
        title: "Címek létrehozása", 
        page: "címek",
        addressTypes: addressTypes
    })

Mert itt a címeknél mi nem szedjük le ugyanúgy a message-t, mint ahogy a profil-nál!! 
        messages: req.query.message ? req.query.message.split(",") : [],
        success: req.query.success ? req.query.success === "true": true
    })
Ez sok helyen kelleni, fog, ezért csinálunk neki egy getMessageAndSuccess.js-t
    const messageAndSuccess = getMessageAndSuccess(req.query);
        
    res.render("private/profile", {
        layout: "./layouts/private_layout",
        title: "Profil Szerkesztése",
        profileData: profileData.message, //itt meg megszerezzük az összes mezőt az adatbázisból 
        page: "profil", 
        message: messageAndSuccess.message,
        success: messageAndSuccess.success

Itt lementjük egy változóban (meghívjuk) a getMessage... segédfüggvényt, megadjuk neki a req.query-t és ugye ez egy objektum 
amiben van egy message meg egy success 
és a render-ben külön megadjuk azt a kulcsnak az értékét, amire szükség van, tehát az egyiknél message a másiknál success 
->
    message: messageAndSuccess.message,
    success: messageAndSuccess.success

és ezt mindenhol, így fel tudjuk használni pl. itt a címeknél is 
-> 
app.get("/címek", async (req, res)=> {
    const addressTypes = await a.getAddressTypes();
    const messageAndSuccess = getMessageAndSuccess(req.query);

    res.render("user/addresses", {
        layout: "./layouts/private_layout", 
        title: "Címek létrehozása", 
        page: "címek",
        addressTypes: addressTypes,
        message: messageAndSuccess.message,
        success: messageAndSuccess.success
    })

És ilyenkor, ha nem írunk semmit és úgy probálunk menteni, akkor kiírja a hibaüzeneteket (errors), amit csináltunk az Addresses.js-ben 
a chechData-ban 
Ha meg kitöltjük jól, akkor az sql-ben bevittünk egy sor adatot (rekordot) 
addressID   addressType   userID    postalCode    settlement   street    houseNumber    floorNumber     doorNumber     created     updated
   1            1           6          1157        Budapest  Akármi utca     50              6              10       2024-10-...     NULL

Az jó, hogy itt létrehoztunk egy címet, de hogy tudjuk szerkezteni a címeinket, ahhoz mindenképpen szükséges az, hogy külön oldalon meg tudjuk 
nyítni 
-> 
és egy nagyon hasonló form-val, úgyhogy már be vannak helyetesítve az adatok (amiket beírtunk) el tudjuk menteni 
Egy olyan oldal lesz, hogy egy grid rendszer-ben felül lesznek a címeink és még lesz egy olyan gomb, hogy cím létrehozása 
Arra fog menni ez az egész, hogy cím létrehozása, user mappában átírjuk a mostani addresses-t create_address-re

Átírunk pár dolgot, hogy 
app.get("/címek", async (req, res)=> {
    const addressTypes = await a.getAddressTypes();
    const messageAndSuccess = getMessageAndSuccess(req.query);

    res.render("user/addresses", {
        layout: "./layouts/private_layout", 
        title: "Címek létrehozása", 
        page: "címek",
        addressTypes: addressTypes,
        message: messageAndSuccess.message,
        success: messageAndSuccess.success
    })
}); 

1. app.get("/címek", ->             app.get("/cím-letrehozasa",
2. res.render("user/addresses", ->  res.render("user/create-address"

3. a volt addresses.ejs-en (jelenlei átnevezett create_address.ejs)
<form class="box" method="POST" action="/addresses">  ->  <form class="box" method="POST" action="/create_address">

4. post-ban pedig nem a címekre hanem a cim-letrehozasa-ra fog redirect-elni 
->
res.status(response.status).redirect(`/címek?message=${response.message}&success=${success}`);
-> 
res.status(response.status).redirect(`/cim-letrehozasa?message=${response.message}&success=${success}`);

5. és a post is arra készül majd 
app.post("/addresses"
->
app.post("/create_address"

Azért nem csináltuk jól ezt a dolgot és ezt már jó lett volna már az elején tisztázni 
Lesz két felhasználótípusunk, az egyik az admin, a másik pedig a nem admin 
És ezért nem mindegy, hogy admin-nak vagyunk a profil-ján, az admin látja a címeket 

mindenhova odaírunk elé egy user-t 
app.post("/user/create_address
app.get("/user/cim-letrehozasa"
app.post("/user/profil"
app.get("/user/profil"
plusz itt a redirect-eknél is 
-> 
redirect(`/user/cim-letrehozasa?message=${response.message}&success=${success}
res.redirect(`/user/profil?success=${success}&messages=${response.message}`);

És amikor bejelentkezünk az is egy ilyen vízválasztó, merthogy tudnunk kellene nem csak a userName-t userID-t 
Hanem azt is, hogy mi a userType illetve azt a mi esetünkben, hogy admin-e (isAdmin)!!! 
-> 
Mert, hogyha admin, akkor a /admin/profil-ra fogjuk átírányítani, ha meg nem, akkor meg a user/profil-ra
és akkor nekünk az adatbázisban van az isAdmin mező, ezt is át kell adni és majd ettől is függ, hogy hova írányitunk át 
itt a bejelentkezésnél 
->
app.post("/login", async (req, res)=> {
    let response;

    try{
        response = uh.login(req.body);
        req.session.userName = response.userName;
        req.session.userID = response.userID;
    } catch(err) {
        response = err;
    }

    response.success = successHTTP(response.status);


    res.status(response.status).redirect(
        response.success ? "/profil" : `/bejelentkezes?message=${response.message[0]}`
    )

És ezt is le kell majd szedni a userHandler-ben 
-> 
    const response = await conn.promise().query(
        `SELECT userID, userName, isAdmin FROM users WHERE email = ? AND pass = ?`,

Ezt visszaküldjük sikeres bejelentkezés esetén 
    if(response[0] === 1) {
        return {
            status: 200,
            message: response[0][0]    *** itt küldjük vissza 

És itt az index-en, ahova ezt visszaküldtük 
És itt csinálunk egy path változót, kivül, ahogy a response-t csináltuk 
Utána meg a try-ban, hogyha a response objektum, amit visszakaptunk annak a message-e (itt vannak ezek az adatbázisból userID, userName, isAdmin)
ha az isAdmin-nak az értéke nulla, akkor a user/profil-ra fog átírányítani ha meg nem akkor meg az admin/profil-ra 
és ezt fogjuk majd behelyetesíteni a redirect-nél, tehát ha jól ment minden, akkor megnézzük, hogy isAdmin-e és attól függően írányítjuk át 
a user vagy az admin-ra ha meg nem, akkor meg vissza a bejelentkezésre egy message-vel, amit ott ki fogunk írni!! 

app.post("/login", async (req, res)=> {
    let response;
    let path;                                                                     ****

    try{
        response = uh.login(req.body);
        req.session.userName = response.userName;
        req.session.userID = response.userID;

        path = response.message.isAdmin == 0 ? "/user/profil" : "/admin/profil"   ****
    } catch(err) {
        response = err;
    }

    response.success = successHTTP(response.status);


    res.status(response.status).redirect(
        response.success ? path : `/bejelentkezes?message=${response.message[0]}`  ***

És majd a layout-okat is át kell nevezni, mert nem private meg public lesz, hanem public, user meg admin 
    most a private-ot átnvezzük user-re
a layout-ban meg át kell nevezni az a href-et, elé kell írni egy user-t, mert majd lesz egy profil meg címek az admin-nak is 
-> 
            <li class="<%=page === 'profil' ? 'selected-menu' : '' %>">
                <a href="/user/profil">Profil</a>
            </li>
            <li class="<%=page === 'címek' ? 'selected-menu' : '' %>">
                <a href="/user/címek">Címek</a>

És ahol eddig itt a render-nél private_layout-ot használtunk, azt át kell írni user/layout-ra 
Most, hogy be vagyunk jelentkezve, ugye az a profil, amivel be vagyunk az nem admin, ezért most nem /profil vagy /címek lesznek 
hanem http://localhost:3000/user/profil 
****
Az adatokat biztosítani kell itt a címek számára, tehát az adatbázisból le kell szedni a címeket, amik ott vannak és nagyon fontos, 
hogy userID-ként, tehát aki be van jelentkezve egy bizonyos userID-val annak a címei kellenek és lesznek megjelenítve
-> Addresses.js-en csinálunk egy async getAddressesByUser függvényt

    async getAddressesByUser(userID) {
        try {
            const response = await conn.promise().query(`SELECT * FROM addresses WHERE userID = ?`, [userID]);

            return {
                status: 200,
                message: response[0]
            }

Itt meg megcsináljuk egy get-essel a user/címek oldalt 
app.get("/user/címek", async (req, res)=> {
    let response;

    try {
        response = await a.getAddressesByUser(req.session.userID);
    } catch(err) {
        response = err;
    }

    res.render("/user/addresses", { 
        layout: ".layout/user_layout",
        addresses: response.message
    })
});

Eddig ennyi, hogy megszereztük a response-ba a címeket userID-t, amit várt az függvényt az Addresses.js-en azt megadtuk neki itt meghíváskor 
await a.getAddressesByUser(req.session.userID);
és most kell render-elni, de még nincsen ejs fájl, amit render-elni tudunk, ezért csinálunk egy addresses.ejs-t 

Ami még nem jó itt -> await conn.promise().query(`SELECT * FROM addresses WHERE userID = ?`, [userID]);
hogy a types_address táblával kell majd JOIN-olni, mert jelenleg csak annyit ír ki, hogy addressType 1, 2, 3 és az nem mond semmit a user-nek 
->
    try {
        const response = await conn.promise().query(`
            SELECT addresses.* types_address.typeName as addressTypeName
            FROM addresses
            INNER JOIN types_address
            ON types_address.typeID = addresses.addressType
            WHERE userID = ?`, 
            [userID]);

Eddig ennyit csináltunk az addresses.ejs-en, végigment ezen egy forEach-vel (addresses: response.message) és megpróbáljuk kiírni a 
addressTypeName-et (types_address.typeName as addressTypeName)
    <div class="grid">
        <% addresses.forEach((a)=> {%>
            <div class="box">
                <h3>Cím típusa</h3>
                <h4><%=a.addressTypeName%></h4>   ****

És ami fontos, hogy kell csinálni itt egy linket, ami átvisz minket a user/cím-letrehozasa
    <button>
        <a href="/user/cim-letrehozasa">
            Cím létrehozása
        </a>
    </button>

ugye a /user/cim-letrehozasa-nál meg a create_address.ejs van render-elve és óda visz minket és meg tudjuk adni az adatokat 
*****
Annyit kell csinálni mindenhol ahol bekérünk egy userID-t az Addresses.js-en -> egy segédfüggvény checkPermission.js
Itt bekérünk egy userID és megnézzük a másik segédfüggvénnyel, hogy az null vagy undefined, akkor dobunk (throw) egy 403-as 
hibát egy message-vel, hogy nincs jogosultságod megtekinteni ezt az oldalt 
->
function checkPermission(userID) {
    if(nullOrUndefined(userID)) {
        throw {
            status: 403,
            message: "Jelentkezz be a tartalom megtekintéséhez!"
        }
    }
}

És ahol, ahol bekérünk egy userID az Addresses.js-en, ott mindenhol meghívjuk ezt a függvényt 
async createAddress(address, userID) {
    const errors = this.checkData(address);
    checkPermission(userID);

async getAddressesByUser(userID) {
    checkPermission(userID);

és itt az index-en mindenhol, hogyha valami gond van, akkor redirect-el
app.get("/user/profil", async (req, res)=> {
    try {
        checkPermission(req.session.userID);
Itt meghívjuk és fontos, hogy ez a többi előtt legyen, mert akkor ezt a hibát dobja majd elsőnek!!!!!!!!!!!!!!!!!!
És a többi hibát már nem 
Innentől kezdve úgy kell átírányítani nekünk, hogy error.message
->
app.get("/user/profil", async (req, res)=> {
    try {
        checkPermission(req.session.userID);               *******
        const profileData = await p.getProfile(req.session.userID);
        const messageAndSuccess = getMessageAndSuccess(req.query);
        
        res.render("private/profile", {
            layout: "./layouts/user_layout",
            title: "Profil Szerkesztése",
            profileData: profileData.message, //itt meg megszerezzük az összes mezőt az adatbázisból 
            page: "profil", 
            message: messageAndSuccess.message,
            success: messageAndSuccess.success
        })
    } catch(err) {
        res.redirect(`/?message=${err.message}`);          *******

És ha ilyenkor be probálunk menni a .../user/profil-ba, akkor azt fogja kiírni, hogy jelentkezz be..így az URL-ben 
->
localhost:3000/?message=Jelentkezz%20be%20a%20profil%20megtekintéséhez!
És mivel ez a home-re redirect-el minket, ezért a home-ba lesz egy ilyen message, amit meg a home get-esnél megszerzünk a req.query.message-ből
->
app.get("/", (req, res)=> {
    res.render("public/index", 
        {
            layout: "layouts/public_layout", 
            title: "Kezdőlap", 
            page:"index",
            message:req.query.message ? req.query.message : ""   *****
        }
    );
});
Tehát itt visszaadunk egy message-t, ami ugy query-ből jön ?message=${err.message} és ilyenkor a query-nél a message lesz a kulcs az = utáni rész
pedig az érték!!! 
És ezt kiírjuk az index.ejs-re (home), fontos ez (req.query.message ? req.query.message :), hogy csak akkor adjuk át ha létezik a query, mert 
csak akkor akarjuk, hogy ezt az üzenetet kiírja, hogyha van query, mert akkor tudjuk, hogy valami után jöttünk ide (redirect) és nem egyből 

az index.ejs-en meg így kiírjuk 
-> 
<div class="container center-text"></div>
    <h1>Ez itt az index</h1>

    <h3><%=message%></h3>                     ******* és itt nem kell végigmenni rajta, mert ez egy string!! 


user/cim-letrehozasa-nál is van egy checkPermission(req.session.userID)
-> 
app.get("/user/cim-letrehozasa", async (req, res)=> {
    try {
        checkPermission(req.session.userID);
        const addressTypes = await a.getAddressTypes();
        const messageAndSuccess = getMessageAndSuccess(req.query);
    
        res.render("user/create_address", {
            layout: "./layouts/user_layout", 
            title: "Címek létrehozása", 
            page: "címek",
            addressTypes: addressTypes,
            message: messageAndSuccess.message,
            success: messageAndSuccess.success
        })
    } catch(err) {
        res.redirect(`/?message=${err.message}`);
    } 

Tehát ide se tudjon bemenni valaki, úgyhogy nincsen bejelentkezve, ilyenkor egyből kidbjuk a főoldalra egy olyan üzenettel, hogy jelentkezz be 
fontos, hogy ez try-catch blokk-ban legyen!!!!! 

a /user/címek-nél is 
app.get("/user/címek", async (req, res)=> {
    let response;

    try {
        checkPermission(req.session.userID),
        response = await a.getAddressesByUser(req.session.userID);
    } catch(err) {
        if(err.status === 403) {
            res.redirect(`/message=${err.message}`);
        }
        response = err;

De itt lehet több err is, ezért csak akkor írányítunk vissza, hogyha az err-nek a status-a az 403-as, mert azt a hibát dobtuk mi
->
    if(nullOrUndefined(userID)) {
        throw {
            status: 403,
            message: "Jelentkezz be a tartalom megtekintéséhez!"
        }

És most kitöltöttük a form-ot a /user/cimek-letrehozasa-n és amikor beküldjük, akkor megszolítjuk ezt az endpoint-ot 
->
app.post("/user/create_address",
ami create_address.ejs az action 
->
<form class="box" method="POST" action="/user/create_address">

És ha jól töltöttük ki, akkor az url-ben kiírja
-> 
localhost:3000/user/cim-letrehozasa?message=Sikeres%20létrehozás%20&success=true 
És ezt ki is írja az oldalra
És a címekben megtekinthetjük (ha rákattintunk a címekre, localhost:3000/user/címek)
ott a grid-ben ki lesz írva a cím, amit felvittünk 
    <div class="grid">
        <% addresses.forEach((a)=> {%>
            <div class="box">
                <h3>Cím típusa</h3>
                <h4><%=a.addressTypeName%></h4>


Az lenne a jó, hogyha a create-address.ejs átírányítana minket egy olyanra, hogy user/cim-letrehozasa és egy szám 
A szám meg az új cím id-ja lenne!!!!!!!!!!!!!!!
Tehát a create-address nem úgy írányít át minket, hogy ott van egy message, tehát ha sikeres volt, akkor oda kell átírányítania, hogy 
user/cim-letrehozasa/id 
Az id-t meg vissza kell nekünk itt adni (insertId-t)
-> 
app.post("/user/create_address", async (req, res)=> {
    let response;

    try {
        response = await a.createAddress(req.body, req.session.userID);
    } catch(err) {
        response = err;
    }

    const success = successHTTP(response.status);
    res.status(response.status).redirect(`/user/cim-letrehozasa?message=${response.message}&success=${success}`);
});
-> 
app.post("/user/create_address", async (req, res)=> {
    //itt szedjük majd le az adatokat 
    let response;

    try {
        response = await a.createAddress(req.body, req.session.userID);
    } catch(err) {
        response = err;
    }

    const success = successHTTP(response.status);

    if(success) {
    *****
        res.status(response.status).redirect(`/user/cim-letrehozasa/${response.insertID}?message=${response.message}&success=${success}`);
    } else {
        res.status(response.status).redirect(`/user/cim-letrehozasa?message=${response.message}&success=${success}`);
    }

Erre meg kell csinálnunk egy get-es kérést, ami nagyon hasonló lesz a az app.get("/user/cim-letrehozasa", .. )-hoz
->
app.get("/user/cim-letrehozasa:addressID"
Ha van nekünk addressID-nk, akkor le kell szedni az addressID alapján, szükségünk van egy olyanra, hogy getAddressByID
amit most megcsinálnuk az Addresses.js-en!! 
->
    async getAddressByID(addressID, userID) {
        checkPermission(userID);

        try {
            const response = await conn.promise().query(`
                SELECT addresses.* types_address.typeName as addressTypeName
                FROM addresses
                INNER JOIN types_address
                ON types_address.typeID = addresses.addressType
                WHERE addressID = ? AND userID = ?`, 
                [addressID, userID]);

                if(response[0].length > 0) {
                    return {
                        status: 200,
                        message: response[0]
                    }
                } else {
                    throw {
                        status: 404,
                        message: ["A keresett cím nem található!"]
                    }
                }

        } catch(err) {
            console.log("Addresses.getAddressByID: ", err);

            if (err.status) {
                throw err;
            }
            throw {
                status: 503,
                message: ["A szolgáltatás jelenleg nem érhető el!"]
            }
        }
    }
És ez azért fontos, mert az URL-ben meg fog jelenni /szám valami és oda beírhat bármilyen hülyeséget a felhasználó
és akkor jelezni kell ezzel 
                    throw {
                        status: 404,
                        message: ["A keresett cím nem található!"]
                    }

Valaki szokta probálgatni az URL-eket, hogy itt egy 6-os van a végén, mi lenne ha 12-es írnák be és akkor kap egy ilyen üzenetet, hogy a 
keresett cím nem található!!!! 
*/ 