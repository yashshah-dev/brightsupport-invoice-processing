const fs = require('fs');
const servicesData = JSON.parse(fs.readFileSync('./data/services.json', 'utf8'));

const serviceOptions = servicesData.filter(s => s.active && s.category !== 'travel' && s.category !== 'transport' && s.category !== 'activity_based_transport');

const serviceMatchesBucket = (serviceCategory, bucket) => {
  if (bucket === 'weekday') {
    return serviceCategory === 'weekday';
  }
  return serviceCategory === bucket;
};

const findFirstServiceForGroupAndBucket = (group, bucket) => {
  const candidates = serviceOptions.filter(
    (s) => s.registrationGroupNumber === group && serviceMatchesBucket(s.category, bucket)
  );
  return candidates[0] || null;
};

console.log('0104 weekday:', findFirstServiceForGroupAndBucket('0104', 'weekday'));
