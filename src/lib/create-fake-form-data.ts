const pick = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const int = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

function randomDOB(minAge = 21, maxAge = 65) {
  const now = new Date();
  const age = int(minAge, maxAge);
  const year = now.getFullYear() - age;
  const month = int(1, 12);
  // keep it simple & always-valid
  const day = int(1, 28);
  return { day, month, year };
}

function randomUKMobile() {
  // UK mobiles: +447 followed by 9 digits
  const nine = String(int(0, 999_999_999)).padStart(9, '0');
  return `+447${nine}`;
}

function randomUKPostcode() {
  // A handful of plausible UK postcodes
  const pcs = [
    'SW1A 1AA',
    'EC1A 1BB',
    'W1A 0AX',
    'M1 1AE',
    'B33 8TH',
    'CR2 6XH',
    'DN55 1PT',
    'L1 8JQ',
    'BS1 4ST',
    'NG1 5FS',
  ];
  return pick(pcs);
}

export function generateRandomCardholder() {
  const firsts = [
    'Alex',
    'Sam',
    'Jordan',
    'Taylor',
    'Casey',
    'Riley',
    'Morgan',
    'Charlie',
    'Jamie',
    'Avery',
  ];
  const lasts = [
    'Johnson',
    'Smith',
    'Brown',
    'Taylor',
    'Wilson',
    'Davies',
    'Evans',
    'Thomas',
    'Roberts',
    'Walker',
  ];
  const streets = [
    'High Street',
    'Station Road',
    'Church Road',
    'Victoria Road',
    'Green Lane',
    'Manor Road',
    'Park Road',
    'London Road',
    'Main Street',
    'The Crescent',
  ];
  const cities = [
    'London',
    'Manchester',
    'Birmingham',
    'Leeds',
    'Bristol',
    'Liverpool',
    'Sheffield',
    'Nottingham',
    'Leicester',
    'Newcastle',
  ];
  const counties = [
    'Greater London',
    'Greater Manchester',
    'West Midlands',
    'West Yorkshire',
    'Bristol',
    'Merseyside',
    'South Yorkshire',
    'Nottinghamshire',
    'Leicestershire',
    'Tyne and Wear',
  ];

  const first = pick(firsts);
  const last = pick(lasts);
  const displayName = `${first} ${last}`.slice(0, 24);
  const dob = randomDOB(22, 60);
  const line1 = `${int(1, 200)} ${pick(streets)}`;
  const city = pick(cities);
  const state = pick(counties);
  const postal = randomUKPostcode();
  const email = `${first.toLowerCase()}.${last.toLowerCase()}${int(
    1,
    99
  )}@example.co.uk`;
  const phone = randomUKMobile();

  return {
    name: displayName,
    individual: {
      first_name: first,
      last_name: last,
      dob,
    },
    billing: {
      address: {
        line1,
        city,
        state,
        postal_code: postal,
        country: 'GB',
      },
    },
    email,
    phone_number: phone,
    // metadata omitted for simplicity
  };
}
