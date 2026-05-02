import { createContext, useContext, useEffect, useState } from 'react';

const LocationContext = createContext(null);

export function LocationProvider({ children }) {
    const [cityTemp, setCityTemp] = useState(null);

    useEffect(() => {
        const fetchTemp = (lat, lon) => {
            fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m`)
                .then(r => r.json())
                .then(d => setCityTemp(d.current?.temperature_2m ?? null))
                .catch(() => { });
        };

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => fetchTemp(pos.coords.latitude, pos.coords.longitude),
                () => fetchTemp(24.58, 73.68) // fallback to Udaipur
            );
        } else {
            fetchTemp(24.58, 73.68);
        }
    }, []); // runs only once for the entire app

    return (
        <LocationContext.Provider value={{ cityTemp }}>
            {children}
        </LocationContext.Provider>
    );
}

export function useCityTemp() {
    return useContext(LocationContext);
}