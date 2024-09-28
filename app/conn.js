import mysql2 from "mysql2";

function conn() {
    const conn = mysql2.createConnection({
        host: "127.0.0.1",
        user: "root",
        password: "",
        database: "webshop"
    })
}

export default conn;