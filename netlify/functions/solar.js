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

        // --- 🔒 CONFIGURATION 🔒 ---
        const VALID_USER = "admin";       
        const VALID_PASS = "solar123";    
        const API_TOKEN = "709y2mp8451cylc04cq77bw2g83t006l"; // <--- PASTE YOUR TOKEN
        // ---------------------------

        if (username !== VALID_USER || password !== VALID_PASS) {
            return { statusCode: 401, headers, body: JSON.stringify({ error: "Wrong credentials" }) };
        }

        // Initialize empty result containers
        let summaryData = null;
        let deviceList = [];
        let errors = [];

        // --- ATTEMPT 1: GET POWER DATA (V1) ---
        try {
            const v1Response = await fetch("https://openapi.growatt.com/v1/plant/list", {
                method: 'GET',
                headers: { 'token': API_TOKEN }
            });
            
            if (v1Response.ok) {
                const v1Json = await v1Response.json();
                
                // Flexible search for the plant object
                let plant = null;
                if (v1Json.data && v1Json.data.plants && v1Json.data.plants.length > 0) {
                    plant = v1Json.data.plants[0];
                } else if (Array.isArray(v1Json.data) && v1Json.data.length > 0) {
                    plant = v1Json.data[0];
                }

                if (plant) {
                    summaryData = {
                        name: plant.plant_name || plant.name || "Solar Plant",
                        currentPower: plant.pac || plant.current_power || 0,
                        dailyEnergy: plant.e_today || plant.today_energy || 0,
                        totalEnergy: plant.total_energy || 0,
                        status: (parseFloat(plant.pac || 0) > 0) ? "online" : "offline"
                    };
                }
            } else {
                errors.push(`V1 Failed: ${v1Response.status}`);
            }
        } catch (err) {
            console.error("V1 Crash:", err);
            errors.push("V1 Crash");
        }

        // --- ATTEMPT 2: GET DEVICE LIST (V4) ---
        try {
            const v4Params = new URLSearchParams();
            v4Params.append('page', '1');
            v4Params.append('pagesize', '50');

            const v4Response = await fetch("https://openapi.growatt.com/v4/new-api/queryDeviceList", {
                method: 'POST',
                headers: { 
                    'token': API_TOKEN, 
                    'Content-Type': 'application/x-www-form-urlencoded' 
                },
                body: v4Params
            });

            if (v4Response.ok) {
                const v4Text = await v4Response.text(); // Get text first to prevent JSON crash
                try {
                    const v4Json = JSON.parse(v4Text);
                    // Locate the list inside the response
                    if (v4Json.data && v4Json.data.data) {
                        deviceList = v4Json.data.data;
                    } else if (Array.isArray(v4Json.data)) {
                        deviceList = v4Json.data;
                    }
                } catch (e) {
                    console.error("V4 JSON Parse Error:", v4Text);
                    errors.push("V4 JSON Invalid");
                }
            } else {
                errors.push(`V4 Failed: ${v4Response.status}`);
            }
        } catch (err) {
            console.error("V4 Crash:", err);
            errors.push("V4 Crash");
        }

        // --- FINAL PACKAGE ---
        // Even if both failed, we return a valid JSON structure so the frontend doesn't break
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                debug_errors: errors, // Viewable in browser console
                data: {
                    summary: summaryData || { name: "No Data", currentPower: 0, dailyEnergy: 0, totalEnergy: 0, status: "offline" },
                    devices: deviceList || []
                }
            })
        };

    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: "Major System Error: " + error.message })
        };
    }
};