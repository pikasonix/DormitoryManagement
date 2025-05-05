/**
 * Date utility functions for formatting dates
 */

/**
 * Format a date string to dd/mm/yyyy hh:mm format
 * @param {string|Date} date - The date to format
 * @returns {string} Formatted date string
 */
export const formatDate = (date) => {
    if (!date) return '-';

    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}`;
};

/**
 * Format a date to dd/mm/yyyy format
 * @param {string|Date} date - The date to format
 * @returns {string} Formatted date string
 */
export const formatDateOnly = (date) => {
    if (!date) return '-';

    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    return `${day}/${month}/${year}`;
};

/**
 * Format month and year to 'Tháng MM/YYYY' format
 * @param {number|string} month - Month number (1-12)
 * @param {number|string} year - Year
 * @returns {string} Formatted month and year
 */
export const formatMonthYear = (month, year) => {
    if (!month || !year) return '-';

    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    if (isNaN(monthNum) || isNaN(yearNum)) return '-';

    const formattedMonth = String(monthNum).padStart(2, '0');
    return `Tháng ${formattedMonth}/${yearNum}`;
};

/**
 * Get a readable date interval for a given period
 * @param {string} start - Start date
 * @param {string} end - End date
 * @returns {string} Formatted date interval
 */
export const getDateInterval = (start, end) => {
    if (!start || !end) return '-';

    return `${formatDateOnly(start)} - ${formatDateOnly(end)}`;
};