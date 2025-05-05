import React from 'react';

const WaterDropIcon = ({ className = "h-5 w-5", color = "#3B82F6" }) => {
    // Calculate path for inner border with half the thickness of the previous version
    const outerPath = "M132.281,264.564c51.24,0,92.931-41.681,92.931-92.918c0-50.18-87.094-164.069-90.803-168.891L132.281,0l-2.128,2.773c-3.704,4.813-90.802,118.71-90.802,168.882C39.352,222.883,81.042,264.564,132.281,264.564z";
    const innerPath = "M132.281,249.564c43.24,0,77.931-34.681,77.931-77.918c0-42.18-72.094-139.069-75.803-143.891L132.281,25l-2.128,2.773c-3.704,4.813-75.802,101.71-75.802,143.882C54.352,214.883,89.042,249.564,132.281,249.564z";

    return (
        <svg
            version="1.1"
            viewBox="0 0 264.564 264.564"
            className={className}
            xmlns="http://www.w3.org/2000/svg"
        >
            <g>
                {/* Outer path - full color */}
                <path
                    d={outerPath}
                    fill={color}
                />

                {/* Inner path - creates the inner border effect */}
                <path
                    d={innerPath}
                    fill="#FFFFFF"
                    fillOpacity="0.5"
                />
            </g>
        </svg>
    );
};

export default WaterDropIcon;