const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data');

if (!fs.existsSync(DB_PATH)) {
    fs.mkdirSync(DB_PATH, { recursive: true });
}

class JsonDb {
    constructor(collectionName) {
        this.filePath = path.join(DB_PATH, `${collectionName}.json`);
        if (!fs.existsSync(this.filePath)) {
            fs.writeFileSync(this.filePath, JSON.stringify([]));
        }
    }

    async find(query = {}) {
        const data = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
        return data.filter(item => {
            for (const key in query) {
                if (item[key] !== query[key]) return false;
            }
            return true;
        });
    }

    async findOne(query = {}) {
        const results = await this.find(query);
        return results[0] || null;
    }

    async save(item) {
        const data = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
        const newItem = { ...item, _id: item._id || Date.now().toString() };
        data.push(newItem);
        fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
        return newItem;
    }
}

module.exports = JsonDb;
