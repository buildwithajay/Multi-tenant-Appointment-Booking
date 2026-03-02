export default function AppointlyLogo({ className = '', compact = false }) {
    return (
        <svg
            className={className}
            viewBox={compact ? '0 0 100 120' : '0 0 420 120'}
            xmlns="http://www.w3.org/2000/svg"
            role="img"
            aria-label="Appointly"
        >
            <rect x="10" y="20" rx="18" ry="18" width="80" height="80" fill="#38BDF8" />
            <rect x="10" y="20" width="80" height="25" fill="#22D3EE" />
            <circle cx="50" cy="70" r="22" fill="#0F172A" />
            <path
                d="M45 70 L50 75 L60 60"
                stroke="#F8FAFC"
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            {!compact && (
                <>
                    <text x="110" y="78" fontFamily="Poppins, Arial" fontSize="42" fill="#F8FAFC" fontWeight="600">
                        Appoint
                    </text>
                    <text x="275" y="78" fontFamily="Poppins, Arial" fontSize="42" fill="#94A3B8" fontWeight="300">
                        ly
                    </text>
                </>
            )}
        </svg>
    );
}
