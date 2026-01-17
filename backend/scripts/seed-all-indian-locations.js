const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

// Helper function to generate slug
function generateSlug(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Comprehensive Indian locations data - 25 States with major cities and local areas
const indianLocationsData = {
  // Maharashtra
  'Maharashtra': {
    cities: [
      { name: 'Mumbai', pincode: '400001', latitude: 19.0760, longitude: 72.8777, areas: [
        'Andheri', 'Bandra', 'Borivali', 'Chembur', 'Dadar', 'Goregaon', 'Juhu', 'Kandivali',
        'Kurla', 'Malad', 'Mulund', 'Navi Mumbai', 'Powai', 'Thane', 'Vashi', 'Vikhroli', 'Worli'
      ]},
      { name: 'Pune', pincode: '411001', latitude: 18.5204, longitude: 73.8567, areas: [
        'Baner', 'Hinjewadi', 'Kalyani Nagar', 'Koregaon Park', 'Viman Nagar', 'Wakad', 'Hadapsar', 'Kharadi'
      ]},
      { name: 'Nagpur', pincode: '440001', latitude: 21.1458, longitude: 79.0882, areas: [
        'Civil Lines', 'Dharampeth', 'Ramdaspeth', 'Sadar', 'Wardhaman Nagar'
      ]},
      { name: 'Thane', pincode: '400601', latitude: 19.2183, longitude: 72.9781, areas: [
        'Kolshet', 'Majiwada', 'Manpada', 'Naupada', 'Vartak Nagar'
      ]},
      { name: 'Aurangabad', pincode: '431001', latitude: 19.8762, longitude: 75.3433, areas: [
        'Cidco', 'Jalna Road', 'Pachakhan'
      ]},
      { name: 'Solapur', pincode: '413001', latitude: 17.6599, longitude: 75.9064, areas: []},
      { name: 'Amravati', pincode: '444601', latitude: 20.9374, longitude: 77.7796, areas: []},
      { name: 'Kolhapur', pincode: '416001', latitude: 16.7050, longitude: 74.2433, areas: []},
      { name: 'Sangli', pincode: '416416', latitude: 16.8524, longitude: 74.5815, areas: []},
      { name: 'Bhiwandi', pincode: '421302', latitude: 19.3000, longitude: 73.0667, areas: []},
    ]
  },

  // Delhi
  'Delhi': {
    cities: [
      { name: 'New Delhi', pincode: '110001', latitude: 28.6139, longitude: 77.2090, areas: [
        'Connaught Place', 'Dwarka', 'Karol Bagh', 'Lajpat Nagar', 'Rohini', 'Saket', 'Vasant Kunj',
        'Greater Kailash', 'Hauz Khas', 'Rajouri Garden', 'Janakpuri', 'Pitampura', 'Laxmi Nagar',
        'Preet Vihar', 'Rohini', 'Paschim Vihar', 'Dwarka', 'Mayur Vihar', 'Vikaspuri'
      ]},
    ]
  },

  // Karnataka
  'Karnataka': {
    cities: [
      { name: 'Bangalore', pincode: '560001', latitude: 12.9716, longitude: 77.5946, areas: [
        'Electronic City', 'Indiranagar', 'Koramangala', 'Marathahalli', 'Whitefield', 'HSR Layout',
        'BTM Layout', 'Jayanagar', 'Malleshwaram', 'Rajajinagar', 'Brigade Road', 'MG Road',
        'Hebbal', 'Yelahanka', 'JP Nagar', 'Banashankari', 'Basavanagudi', 'Vijayanagar'
      ]},
      { name: 'Mysore', pincode: '570001', latitude: 12.2958, longitude: 76.6394, areas: [
        'Vijayanagar', 'Jayalakshmipuram', 'Gokulam', 'Bogadi'
      ]},
      { name: 'Hubli', pincode: '580001', latitude: 15.3647, longitude: 75.1240, areas: []},
      { name: 'Belgaum', pincode: '590001', latitude: 15.8497, longitude: 74.4977, areas: []},
      { name: 'Mangalore', pincode: '575001', latitude: 12.9141, longitude: 74.8560, areas: [
        'Kadri', 'Mallikatta', 'Bejai'
      ]},
      { name: 'Tumkur', pincode: '572101', latitude: 13.3409, longitude: 77.1013, areas: []},
      { name: 'Davangere', pincode: '577001', latitude: 14.4644, longitude: 75.9218, areas: []},
    ]
  },

  // Tamil Nadu
  'Tamil Nadu': {
    cities: [
      { name: 'Chennai', pincode: '600001', latitude: 13.0827, longitude: 80.2707, areas: [
        'Adyar', 'Anna Nagar', 'Besant Nagar', 'Porur', 'T Nagar', 'Velachery', 'Nungambakkam',
        'Egmore', 'Tambaram', 'Chromepet', 'OMR', 'ECR', 'Ambattur', 'Alandur', 'Perambur'
      ]},
      { name: 'Coimbatore', pincode: '641001', latitude: 11.0168, longitude: 76.9558, areas: [
        'RS Puram', 'Saibaba Colony', 'Peelamedu', 'Saravanampatti'
      ]},
      { name: 'Madurai', pincode: '625001', latitude: 9.9252, longitude: 78.1198, areas: [
        'Anna Nagar', 'KK Nagar', 'Villapuram'
      ]},
      { name: 'Tiruchirappalli', pincode: '620001', latitude: 10.7905, longitude: 78.7047, areas: []},
      { name: 'Salem', pincode: '636001', latitude: 11.6643, longitude: 78.1460, areas: []},
      { name: 'Tirunelveli', pincode: '627001', latitude: 8.7139, longitude: 77.7567, areas: []},
    ]
  },

  // Gujarat
  'Gujarat': {
    cities: [
      { name: 'Ahmedabad', pincode: '380001', latitude: 23.0225, longitude: 72.5714, areas: [
        'Satellite', 'Vastrapur', 'Bopal', 'Maninagar', 'Navrangpura', 'CG Road', 'Prahladnagar',
        'Bodakdev', 'Science City', 'Vastral', 'Naroda', 'Bapunagar'
      ]},
      { name: 'Surat', pincode: '395001', latitude: 21.1702, longitude: 72.8311, areas: [
        'Athwa', 'Adajan', 'Vesu', 'Piplod', 'Varachha'
      ]},
      { name: 'Vadodara', pincode: '390001', latitude: 22.3072, longitude: 73.1812, areas: [
        'Alkapuri', 'Fatehgunj', 'Sayajigunj', 'Makarpura'
      ]},
      { name: 'Rajkot', pincode: '360001', latitude: 22.3039, longitude: 70.8022, areas: []},
      { name: 'Bhavnagar', pincode: '364001', latitude: 21.7645, longitude: 72.1519, areas: []},
      { name: 'Jamnagar', pincode: '361001', latitude: 22.4707, longitude: 70.0587, areas: []},
    ]
  },

  // Uttar Pradesh
  'Uttar Pradesh': {
    cities: [
      { name: 'Lucknow', pincode: '226001', latitude: 26.8467, longitude: 80.9462, areas: [
        'Gomti Nagar', 'Hazratganj', 'Aliganj', 'Indira Nagar', 'Aminabad'
      ]},
      { name: 'Kanpur', pincode: '208001', latitude: 26.4499, longitude: 80.3319, areas: [
        'Civil Lines', 'Panki', 'Kakadeo', 'Barra'
      ]},
      { name: 'Ghaziabad', pincode: '201001', latitude: 28.6692, longitude: 77.4538, areas: [
        'Kaushambi', 'Vasundhara', 'Indirapuram', 'Raj Nagar'
      ]},
      { name: 'Agra', pincode: '282001', latitude: 27.1767, longitude: 78.0081, areas: [
        'Taj Ganj', 'Kamla Nagar', 'Sikandra'
      ]},
      { name: 'Varanasi', pincode: '221001', latitude: 25.3176, longitude: 82.9739, areas: [
        'Cantt', 'Sigra', 'Bhelupur'
      ]},
      { name: 'Noida', pincode: '201301', latitude: 28.5355, longitude: 77.3910, areas: [
        'Sector 62', 'Sector 18', 'Sector 15', 'Greater Noida'
      ]},
      { name: 'Meerut', pincode: '250001', latitude: 28.9845, longitude: 77.7064, areas: []},
      { name: 'Allahabad', pincode: '211001', latitude: 25.4358, longitude: 81.8463, areas: []},
      { name: 'Bareilly', pincode: '243001', latitude: 28.3670, longitude: 79.4304, areas: []},
      { name: 'Moradabad', pincode: '244001', latitude: 28.8389, longitude: 78.7768, areas: []},
      { name: 'Saharanpur', pincode: '247001', latitude: 29.9675, longitude: 77.5451, areas: []},
      { name: 'Gorakhpur', pincode: '273001', latitude: 26.7588, longitude: 83.3697, areas: []},
      { name: 'Firozabad', pincode: '283203', latitude: 27.1591, longitude: 78.3958, areas: []},
      { name: 'Aligarh', pincode: '202001', latitude: 27.8974, longitude: 78.0880, areas: []},
    ]
  },

  // Rajasthan
  'Rajasthan': {
    cities: [
      { name: 'Jaipur', pincode: '302001', latitude: 26.9124, longitude: 75.7873, areas: [
        'Malviya Nagar', 'Vaishali Nagar', 'Raja Park', 'Bani Park', 'Sodala', 'Mansarovar',
        'Vidhyadhar Nagar', 'Pratap Nagar', 'Sanganer', 'Tonk Road'
      ]},
      { name: 'Jodhpur', pincode: '342001', latitude: 26.2389, longitude: 73.0243, areas: [
        'Basni', 'Shastri Nagar', 'Pal Road'
      ]},
      { name: 'Bikaner', pincode: '334001', latitude: 28.0229, longitude: 73.3119, areas: []},
      { name: 'Ajmer', pincode: '305001', latitude: 26.4499, longitude: 74.6399, areas: []},
      { name: 'Udaipur', pincode: '313001', latitude: 24.5854, longitude: 73.7125, areas: [
        'Fateh Sagar', 'Lake City', 'Hiran Magri'
      ]},
    ]
  },

  // West Bengal
  'West Bengal': {
    cities: [
      { name: 'Kolkata', pincode: '700001', latitude: 22.5726, longitude: 88.3639, areas: [
        'Salt Lake', 'New Town', 'Park Street', 'Howrah', 'Dum Dum', 'Sealdah', 'Esplanade',
        'Ballygunge', 'Park Circus', 'Lake Gardens', 'Behala', 'Tollygunge', 'Rashbehari Avenue'
      ]},
      { name: 'Asansol', pincode: '713301', latitude: 23.6739, longitude: 86.9524, areas: []},
      { name: 'Durgapur', pincode: '713201', latitude: 23.5204, longitude: 87.3119, areas: []},
    ]
  },

  // Telangana
  'Telangana': {
    cities: [
      { name: 'Hyderabad', pincode: '500001', latitude: 17.3850, longitude: 78.4867, areas: [
        'Banjara Hills', 'Gachibowli', 'Hitech City', 'Jubilee Hills', 'Kondapur', 'Secunderabad',
        'Banjara Hills', 'Somajiguda', 'Begumpet', 'Madhapur', 'Kukatpally', 'Manikonda',
        'Financial District', 'Nallagandla', 'Hafeezpet'
      ]},
      { name: 'Warangal', pincode: '506001', latitude: 18.0000, longitude: 79.5881, areas: []},
    ]
  },

  // Andhra Pradesh
  'Andhra Pradesh': {
    cities: [
      { name: 'Visakhapatnam', pincode: '530001', latitude: 17.6868, longitude: 83.2185, areas: [
        'MVP Colony', 'Sagar Nagar', 'Dwaraka Nagar', 'Pendurthi'
      ]},
      { name: 'Vijayawada', pincode: '520001', latitude: 16.5062, longitude: 80.6480, areas: [
        'Benz Circle', 'Labbipet', 'PNBS'
      ]},
      { name: 'Guntur', pincode: '522001', latitude: 16.3067, longitude: 80.4365, areas: []},
      { name: 'Nellore', pincode: '524001', latitude: 14.4426, longitude: 79.9865, areas: []},
      { name: 'Kurnool', pincode: '518001', latitude: 15.8281, longitude: 78.0373, areas: []},
      { name: 'Kakinada', pincode: '533001', latitude: 16.9891, longitude: 82.2475, areas: []},
    ]
  },

  // Madhya Pradesh
  'Madhya Pradesh': {
    cities: [
      { name: 'Indore', pincode: '452001', latitude: 22.7196, longitude: 75.8577, areas: [
        'Vijay Nagar', 'Sapna Sangeeta', 'MG Road', 'Sukhliya', 'Anand Bazar'
      ]},
      { name: 'Bhopal', pincode: '462001', latitude: 23.2599, longitude: 77.4126, areas: [
        'MP Nagar', 'Arera Colony', 'Kolar Road', 'Hoshangabad Road'
      ]},
      { name: 'Jabalpur', pincode: '482001', latitude: 23.1815, longitude: 79.9864, areas: []},
      { name: 'Gwalior', pincode: '474001', latitude: 26.2183, longitude: 78.1828, areas: []},
      { name: 'Ujjain', pincode: '456001', latitude: 23.1765, longitude: 75.7885, areas: []},
      { name: 'Sagar', pincode: '470001', latitude: 23.8388, longitude: 78.7378, areas: []},
    ]
  },

  // Kerala
  'Kerala': {
    cities: [
      { name: 'Kochi', pincode: '682001', latitude: 9.9312, longitude: 76.2673, areas: [
        'Kakkanad', 'Edappally', 'Fort Kochi', 'Marine Drive', 'Vytilla', 'Palarivattom',
        'Aluva', 'Thripunithura', 'Eloor', 'Edakochi', 'Mattancherry'
      ]},
      { name: 'Kozhikode', pincode: '673001', latitude: 11.2588, longitude: 75.7804, areas: [
        'Beypore', 'Calicut Beach', 'Feroke'
      ]},
      { name: 'Thrissur', pincode: '680001', latitude: 10.5276, longitude: 76.2144, areas: []},
      { name: 'Trivandrum', pincode: '695001', latitude: 8.5241, longitude: 76.9366, areas: [
        'Kazhakkuttom', 'Karamana', 'Peroorkada', 'Neyyattinkara'
      ]},
      { name: 'Kollam', pincode: '691001', latitude: 8.8932, longitude: 76.6141, areas: []},
    ]
  },

  // Punjab
  'Punjab': {
    cities: [
      { name: 'Amritsar', pincode: '143001', latitude: 31.6340, longitude: 74.8723, areas: [
        'Hall Bazaar', 'Ranjit Avenue', 'Green Avenue'
      ]},
      { name: 'Ludhiana', pincode: '141001', latitude: 30.9010, longitude: 75.8573, areas: [
        'Model Town', 'Sarabha Nagar', 'Feroze Gandhi Market'
      ]},
      { name: 'Jalandhar', pincode: '144001', latitude: 31.3260, longitude: 75.5762, areas: []},
      { name: 'Bhatinda', pincode: '151001', latitude: 30.2110, longitude: 74.9455, areas: []},
      { name: 'Patiala', pincode: '147001', latitude: 30.3398, longitude: 76.3869, areas: []},
    ]
  },

  // Haryana
  'Haryana': {
    cities: [
      { name: 'Gurgaon', pincode: '122001', latitude: 28.4089, longitude: 77.0378, areas: [
        'DLF Phase 1', 'DLF Phase 2', 'DLF Phase 3', 'DLF Phase 4', 'Sector 14', 'Sector 15',
        'Sector 43', 'Sector 46', 'Sohna Road', 'MG Road', 'Cyber City', 'Udyog Vihar'
      ]},
      { name: 'Faridabad', pincode: '121001', latitude: 28.4089, longitude: 77.3178, areas: [
        'Sector 15', 'Sector 16', 'NIT', 'Ballabgarh'
      ]},
      { name: 'Panipat', pincode: '132103', latitude: 29.3909, longitude: 76.9695, areas: []},
      { name: 'Rohtak', pincode: '124001', latitude: 28.8955, longitude: 76.6066, areas: []},
      { name: 'Hisar', pincode: '125001', latitude: 29.1492, longitude: 75.7217, areas: []},
    ]
  },

  // Bihar
  'Bihar': {
    cities: [
      { name: 'Patna', pincode: '800001', latitude: 25.5941, longitude: 85.1376, areas: [
        'Boring Road', 'Kankarbagh', 'Rajendra Nagar', 'Exhibition Road', 'Fraser Road'
      ]},
      { name: 'Gaya', pincode: '823001', latitude: 24.7955, longitude: 84.9994, areas: []},
      { name: 'Muzaffarpur', pincode: '842001', latitude: 26.1209, longitude: 85.3647, areas: []},
      { name: 'Bhagalpur', pincode: '812001', latitude: 25.2532, longitude: 87.0053, areas: []},
    ]
  },

  // Jharkhand
  'Jharkhand': {
    cities: [
      { name: 'Ranchi', pincode: '834001', latitude: 23.3441, longitude: 85.3096, areas: [
        'Hinoo', 'Doranda', 'Ashok Nagar', 'Harmu'
      ]},
      { name: 'Jamshedpur', pincode: '831001', latitude: 22.8046, longitude: 86.2029, areas: [
        'Bistupur', 'Sakchi', 'Kadma', 'Sonari'
      ]},
      { name: 'Dhanbad', pincode: '826001', latitude: 23.7957, longitude: 86.4304, areas: []},
      { name: 'Bokaro', pincode: '827001', latitude: 23.6693, longitude: 86.1511, areas: []},
    ]
  },

  // Odisha
  'Odisha': {
    cities: [
      { name: 'Bhubaneswar', pincode: '751001', latitude: 20.2961, longitude: 85.8245, areas: [
        'Acharya Vihar', 'Patia', 'Khandagiri', 'Bapuji Nagar', 'Rasulgarh'
      ]},
      { name: 'Cuttack', pincode: '753001', latitude: 20.4625, longitude: 85.8829, areas: []},
      { name: 'Rourkela', pincode: '769001', latitude: 22.2604, longitude: 84.8536, areas: []},
      { name: 'Berhampur', pincode: '760001', latitude: 19.3149, longitude: 84.7941, areas: []},
    ]
  },

  // Chhattisgarh
  'Chhattisgarh': {
    cities: [
      { name: 'Raipur', pincode: '492001', latitude: 21.2514, longitude: 81.6296, areas: [
        'Telibandha', 'Pandri', 'Shankar Nagar', 'Amlidih'
      ]},
      { name: 'Bilaspur', pincode: '495001', latitude: 22.0796, longitude: 82.1391, areas: []},
      { name: 'Durg', pincode: '491001', latitude: 21.1904, longitude: 81.2849, areas: []},
    ]
  },

  // Uttarakhand
  'Uttarakhand': {
    cities: [
      { name: 'Dehradun', pincode: '248001', latitude: 30.3165, longitude: 78.0322, areas: [
        'Clement Town', 'Rajpur Road', 'Dharampur', 'Karanpur'
      ]},
      { name: 'Haridwar', pincode: '249401', latitude: 29.9457, longitude: 78.1642, areas: []},
      { name: 'Nainital', pincode: '263001', latitude: 29.3919, longitude: 79.4542, areas: []},
    ]
  },

  // Himachal Pradesh
  'Himachal Pradesh': {
    cities: [
      { name: 'Shimla', pincode: '171001', latitude: 31.1048, longitude: 77.1734, areas: [
        'The Mall', 'Lower Bazaar', 'Sanjauli'
      ]},
      { name: 'Dharamshala', pincode: '176215', latitude: 32.2190, longitude: 76.3234, areas: []},
      { name: 'Solan', pincode: '173212', latitude: 30.9045, longitude: 77.0965, areas: []},
    ]
  },

  // Jammu and Kashmir
  'Jammu and Kashmir': {
    cities: [
      { name: 'Srinagar', pincode: '190001', latitude: 34.0837, longitude: 74.7973, areas: [
        'Lal Chowk', 'Rajbagh', 'Bemina', 'Hazratbal'
      ]},
      { name: 'Jammu', pincode: '180001', latitude: 32.7266, longitude: 74.8570, areas: [
        'Gandhi Nagar', 'Channi Himmat', 'Bahu Plaza'
      ]},
    ]
  },

  // Chandigarh
  'Chandigarh': {
    cities: [
      { name: 'Chandigarh', pincode: '160001', latitude: 30.7333, longitude: 76.7794, areas: [
        'Sector 17', 'Sector 35', 'Sector 22', 'Sector 8', 'Sector 9', 'Sector 10', 'Sector 11',
        'Manimajra', 'Zirakpur', 'Panchkula'
      ]},
    ]
  },

  // Goa
  'Goa': {
    cities: [
      { name: 'Panaji', pincode: '403001', latitude: 15.4909, longitude: 73.8278, areas: [
        'Miramar', 'Fontainhas', 'Campal'
      ]},
      { name: 'Margao', pincode: '403601', latitude: 15.2774, longitude: 73.9578, areas: []},
      { name: 'Vasco', pincode: '403802', latitude: 15.3875, longitude: 73.8140, areas: []},
    ]
  },

  // Assam
  'Assam': {
    cities: [
      { name: 'Guwahati', pincode: '781001', latitude: 26.1445, longitude: 91.7362, areas: [
        'Beltola', 'Dispur', 'Zoo Road', 'Ulubari', 'Ganeshguri'
      ]},
      { name: 'Silchar', pincode: '788001', latitude: 24.8270, longitude: 92.7979, areas: []},
      { name: 'Dibrugarh', pincode: '786001', latitude: 27.4728, longitude: 95.0031, areas: []},
    ]
  },

  // Manipur
  'Manipur': {
    cities: [
      { name: 'Imphal', pincode: '795001', latitude: 24.8170, longitude: 93.9368, areas: [
        'Lamphelpat', 'Khongman', 'Uripok'
      ]},
    ]
  },

  // Meghalaya
  'Meghalaya': {
    cities: [
      { name: 'Shillong', pincode: '793001', latitude: 25.5788, longitude: 91.8933, areas: [
        'Laitumkhrah', 'Nongthymmai', 'Police Bazaar'
      ]},
    ]
  },

  // Tripura
  'Tripura': {
    cities: [
      { name: 'Agartala', pincode: '799001', latitude: 23.8315, longitude: 91.2868, areas: [
        'Krishnanagar', 'Usha Bazar', 'GB Bazar'
      ]},
    ]
  },

  // Mizoram
  'Mizoram': {
    cities: [
      { name: 'Aizawl', pincode: '796001', latitude: 23.7271, longitude: 92.7176, areas: [
        'Dawrpui', 'Bawngkawn', 'Chaltlang'
      ]},
    ]
  },

  // Nagaland
  'Nagaland': {
    cities: [
      { name: 'Kohima', pincode: '797001', latitude: 25.6751, longitude: 94.1086, areas: [
        'Secretariat', 'AG', 'D Block'
      ]},
      { name: 'Dimapur', pincode: '797112', latitude: 25.9117, longitude: 93.7215, areas: []},
    ]
  },

  // Arunachal Pradesh
  'Arunachal Pradesh': {
    cities: [
      { name: 'Itanagar', pincode: '791111', latitude: 27.0844, longitude: 93.6053, areas: [
        'Naharlagun', 'Ganga', 'Papum Pare'
      ]},
    ]
  },

  // Sikkim
  'Sikkim': {
    cities: [
      { name: 'Gangtok', pincode: '737101', latitude: 27.3389, longitude: 88.6065, areas: [
        'MG Marg', 'Tadong', 'Deorali'
      ]},
    ]
  },

  // Puducherry
  'Puducherry': {
    cities: [
      { name: 'Pondicherry', pincode: '605001', latitude: 11.9416, longitude: 79.8083, areas: [
        'White Town', 'French Quarter', 'Auroville'
      ]},
    ]
  },

  // Lakshadweep
  'Lakshadweep': {
    cities: [
      { name: 'Kavaratti', pincode: '682555', latitude: 10.5667, longitude: 72.6417, areas: []},
    ]
  },

  // Andaman and Nicobar Islands
  'Andaman and Nicobar Islands': {
    cities: [
      { name: 'Port Blair', pincode: '744101', latitude: 11.6234, longitude: 92.7265, areas: [
        'Aberdeen Bazar', 'Junglighat', 'Phoenix Bay'
      ]},
    ]
  },
};

// Convert hierarchical data to flat array for database insertion
function flattenLocationsData(data) {
  const locations = [];

  Object.entries(data).forEach(([state, stateData]) => {
    stateData.cities.forEach(cityData => {
      // Add city entry (no neighbourhood)
      locations.push({
        name: cityData.name,
        state: state,
        city: cityData.name,
        neighbourhood: null,
        pincode: cityData.pincode,
        latitude: cityData.latitude,
        longitude: cityData.longitude
      });

      // Add local areas/neighbourhoods for this city
      if (cityData.areas && cityData.areas.length > 0) {
        cityData.areas.forEach(areaName => {
          locations.push({
            name: areaName,
            state: state,
            city: cityData.name,
            neighbourhood: areaName,
            pincode: cityData.pincode, // Use city pincode as default, can be updated later
            latitude: cityData.latitude, // Approximate, can be updated later
            longitude: cityData.longitude // Approximate, can be updated later
          });
        });
      }
    });
  });

  return locations;
}

async function seedAllIndianLocations() {
  try {
    console.log('\n=== Seeding All Indian Cities and Local Areas (25 States) ===\n');

    const allLocations = flattenLocationsData(indianLocationsData);
    console.log(`Total locations to process: ${allLocations.length}`);
    console.log(`Cities: ${allLocations.filter(l => !l.neighbourhood).length}`);
    console.log(`Local Areas: ${allLocations.filter(l => l.neighbourhood).length}\n`);

    let created = 0;
    let skipped = 0;
    let updated = 0;
    let errors = 0;

    for (const location of allLocations) {
      try {
        const slug = generateSlug(location.name);
        
        // Check if location already exists
        const existing = await prisma.location.findUnique({
          where: { slug: slug }
        });

        if (existing) {
          // Update existing location to ensure all fields are correct
          await prisma.location.update({
            where: { slug: slug },
            data: {
              state: location.state || existing.state,
              city: location.city || existing.city,
              neighbourhood: location.neighbourhood || existing.neighbourhood,
              pincode: location.pincode || existing.pincode,
              latitude: location.latitude || existing.latitude,
              longitude: location.longitude || existing.longitude,
              isActive: true
            }
          });
          console.log(`🔄 Updated: ${location.name}${location.neighbourhood ? ` (${location.neighbourhood}, ${location.city})` : ` (${location.city || location.state})`}`);
          updated++;
          continue;
        }

        await prisma.location.create({
          data: {
            name: location.name,
            slug: slug,
            state: location.state || null,
            city: location.city || null,
            neighbourhood: location.neighbourhood || null,
            pincode: location.pincode || null,
            latitude: location.latitude || null,
            longitude: location.longitude || null,
            isActive: true
          }
        });

        const locationType = location.neighbourhood ? 'Local Area' : 'City';
        console.log(`✅ Created: ${location.name} (${locationType})${location.neighbourhood ? ` - ${location.city}, ${location.state}` : ` - ${location.state}`}`);
        created++;
      } catch (error) {
        console.error(`❌ Error processing ${location.name}:`, error.message);
        errors++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Created: ${created}`);
    console.log(`   🔄 Updated: ${updated}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📍 Total processed: ${allLocations.length}\n`);

    // Get statistics
    const totalLocations = await prisma.location.count();
    const totalCities = await prisma.location.count({
      where: { neighbourhood: null, city: { not: null } }
    });
    const totalAreas = await prisma.location.count({
      where: { neighbourhood: { not: null } }
    });
    const statesCount = await prisma.location.findMany({
      where: { state: { not: null } },
      select: { state: true },
      distinct: ['state']
    });

    console.log(`📍 Database Statistics:`);
    console.log(`   Total Locations: ${totalLocations}`);
    console.log(`   Cities: ${totalCities}`);
    console.log(`   Local Areas: ${totalAreas}`);
    console.log(`   States: ${statesCount.length}\n`);

  } catch (error) {
    console.error('❌ Error seeding locations:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedAllIndianLocations();
