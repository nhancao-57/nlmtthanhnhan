
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
        const { username, password, action, deviceSn, command } = payload;
        
        // --- 🔒 SECURITY CONFIGURATION 🔒 ---
        // REPLACE THESE WITH YOUR ACTUAL CREDENTIALS BEFORE DEPLOYING
        const VALID_USER = "admin";       
        const VALID_PASS = "solar123";    
        const API_TOKEN = "REPLACE_WITH_YOUR_REAL_TOKEN"; 
        const BASE_V1 = "https://openapi.growatt.com/v1";
        const BASE_V4 = "https://openapi.growatt.com/v4/new-api";
        // ------------------------------------------

        // 1. Authentication Layer
        if (username !== VALID_USER || password !== VALID_PASS) {
            return { statusCode: 401, headers, body: JSON.stringify({ error: "Unauthorized" }) };
        }

        // 2. Router (Action Dispatcher)
        switch (action) {
            
            case 'login':
            case 'dashboard':
                return await handleDashboard(API_TOKEN, BASE_V1, BASE_V4);

            case 'detail':
                if (!deviceSn) throw new Error("Device SN required");
                return await handleDetail(API_TOKEN, BASE_V1, deviceSn);

            case 'control':
                if (!deviceSn || !command) throw new Error("Missing control parameters");
                return await handleControl(API_TOKEN, BASE_V4, deviceSn, command);

            default:
                throw new Error("Invalid Action");
        }

    } catch (error) {
        console.error("Handler Error:", error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }
};

// --- HELPER FUNCTIONS ---

async function handleDashboard(token, v1Url, v4Url) {
    // Parallel fetch for speed
    const [plantRes, deviceRes] = await Promise.all([
        fetch(`${v1Url}/plant/list`, { headers: { 'token': token } }),
        fetch(`${v4Url}/queryDeviceList`, {
            method: 'POST',
            headers: { 'token': token, 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ page: '1', pagesize: '50' })
        })
    ]);

    const v1Json = await plantRes.json();
    const v4Json = await deviceRes.json();

    // Extract Plant Data safely
    const plant = (v1Json.data && v1Json.data.plants) ? v1Json.data.plants[0] : {};
    
    // Extract Device List (supporting Example 1 structure if it occurs)
    let devices = [];
    if (v4Json.data && v4Json.data.data) devices = v4Json.data.data;
    else if (v4Json.data && v4Json.data.inv) devices = v4Json.data.inv; // Support Example 1 return type

    return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ success: true, data: { plant, devices } })
    };
}

async function handleDetail(token, v1Url, deviceSn) {
    // Fetch detailed real-time data (Matches your Return Example 2)
    // Note: We use the inverter/data endpoint which typically matches the "datas" structure
    const res = await fetch(`${v1Url}/device/inverter/data?device_sn=${deviceSn}`, { 
        headers: { 'token': token } 
    });
    
    const json = await res.json();
    
    // Safety check for empty data
    const details = (json.data) ? json.data : {};
    
    return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ success: true, data: details })
    };
}

async function handleControl(token, v4Url, deviceSn, command) {
    // Command structure matches your Return Example 3
    // command = { type: 'on_off', value: '100' or '0' }
    
    // "setOnOrOff" implies active power control or boolean switch
    // We map generic commands to the specific API requirements
    
    const params = new URLSearchParams();
    params.append('deviceSn', deviceSn);
    params.append('deviceType', 'inv'); // Defaulting to inverter, adjust if needed
    
    if (command.type === 'power') {
        params.append('value', command.value.toString()); // active power %
    } else if (command.type === 'switch') {
        // Some APIs use a different endpoint for boot/shutdown, but based on your doc:
        // If it's pure on/off, we might need to send 0% or 100% power, 
        // or a specific hex code. Assuming active power control for now based on "setOnOrOff" doc.
        params.append('value', command.value === 'on' ? '100' : '0'); 
    }

    const res = await fetch(`${v4Url}/setOnOrOff`, {
        method: 'POST',
        headers: { 'token': token, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params
    });

    const json = await res.json();

    return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ success: true, api_response: json })
    };
}