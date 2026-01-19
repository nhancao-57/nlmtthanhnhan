exports.handler = async function(event, context) {
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
    };

    if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

    try {
        const payload = JSON.parse(event.body);
        const { username, password } = payload;
        
        // --- 🔒 UPDATE YOUR CREDENTIALS HERE 🔒 ---
        const VALID_USER = "admin";       
        const VALID_PASS = "solar123";    
        const API_TOKEN = "709y2mp8451cylc04cq77bw2g83t006l"; 
        // ------------------------------------------

        if (username !== VALID_USER || password !== VALID_PASS) {
            return { statusCode: 401, headers, body: JSON.stringify({ error: "Wrong credentials" }) };
        }

        // --- PARALLEL API CALLS ---
        const [plantRes, deviceRes] = await Promise.all([
            fetch("https://openapi.growatt.com/v1/plant/list", {
                method: 'GET',
                headers: { 'token': API_TOKEN }
            }),
            fetch("https://openapi.growatt.com/v4/new-api/queryDeviceList", {
                method: 'POST',
                headers: { 'token': API_TOKEN, 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ page: '1', pagesize: '50' })
            })
        ]);

        // --- DATA EXTRACTION ---
        let plant = {};
        let deviceList = [];

        // 1. Safe V1 Parsing
        try {
            const v1Json = await plantRes.json();
            if (v1Json.data && v1Json.data.plants && v1Json.data.plants.length > 0) {
                plant = v1Json.data.plants[0];
            } else if (Array.isArray(v1Json.data) && v1Json.data.length > 0) {
                plant = v1Json.data[0];
            }
        } catch (e) { console.error("V1 Parse Error", e); }

        // 2. Safe V4 Parsing
        try {
            const v4Text = await deviceRes.text();
            const v4Json = JSON.parse(v4Text);
            if (v4Json.data && v4Json.data.data) {
                deviceList = v4Json.data.data;
            } else if (Array.isArray(v4Json.data)) {
                deviceList = v4Json.data;
            }
        } catch (e) { console.error("V4 Parse Error", e); }

        // 3. Return EVERYTHING (No filtering)
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                data: {
                    // We send the RAW object so frontend can find the right keys
                    raw_plant: plant, 
                    devices: deviceList
                }
            })
        };

    } catch (error) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }
};