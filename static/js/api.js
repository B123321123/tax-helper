const API = {
    async calculate(payload) {
        const res = await fetch("/api/calculate", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(payload),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Berechnung fehlgeschlagen");
        }
        return res.json();
    },

    async getConstants() {
        const res = await fetch("/api/constants");
        return res.json();
    },

    async getElsterMap() {
        const res = await fetch("/api/elster-map");
        return res.json();
    },
};
