import checkPermission from "./checkPermission.js";
import conn from "./conn.js";
import nullOrUndefined from "./nullOrUndefined.js";

class Addresses {
    checkData(address) {
        const errors = [];
        const postalCode = parseInt(address.postalCode);

        if (nullOrUndefined(address.addressType)
            || address.addressType == 0) {
            errors.push("Nem választottál ki cím típust");
        }

        if (nullOrUndefined(address.postalCode)
            || isNaN(postalCode) && postalCode < 1000 || postalCode > 9000) {
            errors.push("Az írányítószám formátuma nem megfelelő!");
        }

        if (nullOrUndefined(address.settlement) || address.settlement.length < 3) {
            errors.push("A települést kötelező kitölteni!");
        }

        if (nullOrUndefined(address.street) || address.street.length < 5) {
            errors.push("Az utcát kötelező kitölteni!");
        }

        if (nullOrUndefined(address.houseNumber) || address.houseNumber.length < 1) {
            errors.push("A házszámot kötelező kitölteni!");
        }

        return errors;
    }

    async createAddress(address, userID) {
        const errors = this.checkData(address);
        checkPermission(userID);

        if (errors.length > 0) {
            throw {
                status: 400,
                message: errors
            }
        }


        try {
            const response = await conn.promise().query(`
            INSERT INTO addresses(addressType, userID, postalCode, settlement, street, houseNumber, floorNumber, doorNumber)
            VALUES(?,?,?,?,?,?,?,?)`
            [address.addressType, userID, address.postalCode, address.settlement,
            address.street, address.houseNumber, address.floorNumber, address.doorNumber
            ]
            );

            if (response[0].affectedRows === 1) {
                return {
                    status: 200,
                    message: ["Sikeres létrehozás"],
                    insertID: response[0].insertId
                }
            } else {
                throw {
                    status: 503,
                    message: ["A bejegyzés nem lett létrehozva, mert a szolgáltatás ideglenes nem üzemel!"]
                }
            }

        } catch (err) {
            console.log("Addresses.createAddress: ", err);

            if (err.status) {
                throw err;
            }
            throw {
                status: 503,
                message: ["A profil mentése szolgáltatás jelenleg nem elérhető!"]
            }
        }
    }

    async getAddressTypes() {
        const response = await conn.promise().query(`select * from types_addresses`);
        return response[0];
    }

    async getAddressesByUser(userID) {
        checkPermission(userID);
        try {
            const response = await conn.promise().query(`
                SELECT addresses.* types_address.typeName as addressTypeName
                FROM addresses
                INNER JOIN types_address
                ON types_address.typeID = addresses.addressType
                WHERE userID = ?`, 
                [userID]);

            return {
                status: 200,
                message: response[0]
            }
        } catch(err) {
            console.log("Addresses.getAddressesByUser: ", err);

            if (err.status) {
                throw err;
            }
            throw {
                status: 503,
                message: ["A profil mentése szolgáltatás jelenleg nem elérhető!"]
            }
        }
    }

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

}

export default Addresses;

