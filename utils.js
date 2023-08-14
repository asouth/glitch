function fromDisplayName(displayName) {
    let words = displayName.split(' ');
    let camelCased = words.map((word, index) => 
        index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join('');

    let result = 'data' + camelCased.replace(/^data/i, '');
    return result;
}

function toDisplayName(fieldName) {
    if (fieldName.startsWith("data")) {
        return fieldName.replace('data', '').replace(/([A-Z])/g, ' $1').trim().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
    }
    return fieldName;
}

module.exports = { fromDisplayName, toDisplayName };
