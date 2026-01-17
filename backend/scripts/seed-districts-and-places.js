const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

// Helper function to generate slug
function generateSlug(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Comprehensive districts and important places data
// Districts are added as city-level entries, important places/towns as local areas or cities
const districtsAndPlacesData = {
  // Maharashtra - All Major Districts and Important Places
  'Maharashtra': {
    districts: [
      'Mumbai City', 'Mumbai Suburban', 'Pune', 'Nagpur', 'Thane', 'Nashik', 'Aurangabad',
      'Solapur', 'Amravati', 'Kolhapur', 'Sangli', 'Nanded', 'Ahmednagar', 'Jalgaon',
      'Dhule', 'Ratnagiri', 'Satara', 'Beed', 'Latur', 'Osmanabad', 'Raigad', 'Parbhani',
      'Yavatmal', 'Wardha', 'Buldhana', 'Akola', 'Washim', 'Hingoli', 'Gadchiroli',
      'Chandrapur', 'Bhandara', 'Gondia', 'Jalna', 'Parbhani'
    ],
    additionalCities: [
      { name: 'Nashik', pincode: '422001', latitude: 19.9975, longitude: 73.7898, areas: [
        'Nashik Road', 'Gangapur', 'Satpur', 'Adgaon', 'Pathardi Phata', 'Panchvati', 'Old Nashik'
      ]},
      { name: 'Kalyan', pincode: '421301', latitude: 19.2437, longitude: 73.1355, areas: [
        'Dombivli', 'Titwala', 'Ambernath', 'Badlapur', 'Ulhasnagar'
      ]},
      { name: 'Vasai', pincode: '401201', latitude: 19.4700, longitude: 72.8000, areas: [
        'Virar', 'Nalasopara', 'Manickpur'
      ]},
      { name: 'Jalgaon', pincode: '425001', latitude: 21.0486, longitude: 75.7869, areas: []},
      { name: 'Dhule', pincode: '424001', latitude: 20.9027, longitude: 74.7774, areas: []},
      { name: 'Nanded', pincode: '431601', latitude: 19.1383, longitude: 77.3210, areas: []},
      { name: 'Ahmednagar', pincode: '414001', latitude: 19.0946, longitude: 74.7480, areas: []},
      { name: 'Latur', pincode: '413512', latitude: 18.4088, longitude: 76.5604, areas: []},
      { name: 'Satara', pincode: '415001', latitude: 17.6805, longitude: 73.9933, areas: []},
      { name: 'Ratnagiri', pincode: '415612', latitude: 16.9902, longitude: 73.3120, areas: []},
      { name: 'Raigad', pincode: '402101', latitude: 18.5693, longitude: 73.1808, areas: []},
      { name: 'Wardha', pincode: '442001', latitude: 20.7453, longitude: 78.6022, areas: []},
      { name: 'Chandrapur', pincode: '442401', latitude: 19.9615, longitude: 79.2961, areas: []},
      { name: 'Yavatmal', pincode: '445001', latitude: 20.3888, longitude: 78.1204, areas: []},
      { name: 'Gondia', pincode: '441601', latitude: 21.4609, longitude: 80.1925, areas: []},
    ]
  },

  // Uttar Pradesh - Major Districts and Important Places
  'Uttar Pradesh': {
    districts: [
      'Lucknow', 'Kanpur Nagar', 'Ghaziabad', 'Agra', 'Varanasi', 'Allahabad', 'Meerut',
      'Bareilly', 'Moradabad', 'Saharanpur', 'Gorakhpur', 'Aligarh', 'Noida', 'Firozabad',
      'Mathura', 'Agra', 'Faizabad', 'Sultanpur', 'Azamgarh', 'Basti', 'Deoria', 'Ballia',
      'Jaunpur', 'Mirzapur', 'Sonbhadra', 'Banda', 'Hamirpur', 'Jhansi', 'Lalitpur',
      'Gonda', 'Bahraich', 'Sitapur', 'Hardoi', 'Unnao', 'Rae Bareli', 'Amethi',
      'Sultanpur', 'Pratapgarh', 'Fatehpur', 'Banda', 'Mahoba', 'Chitrakoot'
    ],
    additionalCities: [
      { name: 'Mathura', pincode: '281001', latitude: 27.4924, longitude: 77.6737, areas: [
        'Vrindavan', 'Gokul', 'Barsana'
      ]},
      { name: 'Faizabad', pincode: '224001', latitude: 26.7738, longitude: 82.1406, areas: []},
      { name: 'Sultanpur', pincode: '228001', latitude: 26.2648, longitude: 82.0729, areas: []},
      { name: 'Azamgarh', pincode: '276001', latitude: 26.0634, longitude: 83.1853, areas: []},
      { name: 'Jhansi', pincode: '284001', latitude: 25.4484, longitude: 78.5685, areas: []},
      { name: 'Basti', pincode: '272001', latitude: 26.7948, longitude: 82.7167, areas: []},
      { name: 'Deoria', pincode: '274001', latitude: 26.5047, longitude: 83.7872, areas: []},
      { name: 'Mirzapur', pincode: '231001', latitude: 25.1463, longitude: 82.5682, areas: []},
      { name: 'Sitapur', pincode: '261001', latitude: 27.5665, longitude: 80.6833, areas: []},
      { name: 'Hardoi', pincode: '241001', latitude: 27.3967, longitude: 80.1312, areas: []},
      { name: 'Unnao', pincode: '209801', latitude: 26.5477, longitude: 80.4878, areas: []},
      { name: 'Rae Bareli', pincode: '229001', latitude: 26.2206, longitude: 81.2403, areas: []},
      { name: 'Fatehpur', pincode: '212601', latitude: 25.9265, longitude: 80.8017, areas: []},
      { name: 'Pratapgarh', pincode: '230001', latitude: 25.8909, longitude: 81.9378, areas: []},
    ]
  },

  // Karnataka - Districts and Important Places
  'Karnataka': {
    districts: [
      'Bangalore Urban', 'Bangalore Rural', 'Mysore', 'Hubballi-Dharwad', 'Mangalore',
      'Belgaum', 'Gulbarga', 'Davangere', 'Bellary', 'Bijapur', 'Raichur', 'Tumkur',
      'Shimoga', 'Chitradurga', 'Udupi', 'Hassan', 'Chikkamagaluru', 'Mandya', 'Kolar',
      'Chamrajnagar', 'Dakshina Kannada', 'Uttara Kannada', 'Dharwad', 'Bagalkot',
      'Gadag', 'Haveri', 'Koppal', 'Yadgir', 'Bidar', 'Vijayapura', 'Kalaburagi'
    ],
    additionalCities: [
      { name: 'Gulbarga', pincode: '585101', latitude: 17.3297, longitude: 76.8343, areas: []},
      { name: 'Bellary', pincode: '583101', latitude: 15.1394, longitude: 76.9214, areas: []},
      { name: 'Bijapur', pincode: '586101', latitude: 16.8244, longitude: 75.7154, areas: []},
      { name: 'Raichur', pincode: '584101', latitude: 16.2076, longitude: 77.3463, areas: []},
      { name: 'Shimoga', pincode: '577201', latitude: 13.9299, longitude: 75.5681, areas: []},
      { name: 'Chitradurga', pincode: '577501', latitude: 14.2267, longitude: 76.4008, areas: []},
      { name: 'Udupi', pincode: '576101', latitude: 13.3409, longitude: 74.7421, areas: []},
      { name: 'Hassan', pincode: '573201', latitude: 13.0049, longitude: 76.1025, areas: []},
      { name: 'Mandya', pincode: '571401', latitude: 12.5221, longitude: 76.8975, areas: []},
      { name: 'Chikkamagaluru', pincode: '577101', latitude: 13.3161, longitude: 75.7720, areas: []},
      { name: 'Kolar', pincode: '563101', latitude: 13.1370, longitude: 78.1299, areas: []},
      { name: 'Bagalkot', pincode: '587101', latitude: 16.1690, longitude: 75.6588, areas: []},
      { name: 'Gadag', pincode: '582101', latitude: 15.4313, longitude: 75.6294, areas: []},
      { name: 'Bidar', pincode: '585401', latitude: 17.9133, longitude: 77.5301, areas: []},
      { name: 'Kalaburagi', pincode: '585101', latitude: 17.3297, longitude: 76.8343, areas: []},
    ]
  },

  // Tamil Nadu - Districts and Important Places
  'Tamil Nadu': {
    districts: [
      'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli',
      'Tiruppur', 'Erode', 'Vellore', 'Dindigul', 'Thanjavur', 'Tuticorin', 'Kanchipuram',
      'Kanyakumari', 'Namakkal', 'Karur', 'Theni', 'Dharmapuri', 'Krishnagiri', 'Pollachi',
      'Ariyalur', 'Cuddalore', 'Nagapattinam', 'Ramanathapuram', 'Sivaganga', 'Pudukkottai',
      'Thoothukudi', 'Tiruvallur', 'Tiruvannamalai', 'Villupuram', 'Virudhunagar'
    ],
    additionalCities: [
      { name: 'Tiruppur', pincode: '641601', latitude: 11.1085, longitude: 77.3411, areas: []},
      { name: 'Erode', pincode: '638001', latitude: 11.3410, longitude: 77.7172, areas: []},
      { name: 'Vellore', pincode: '632001', latitude: 12.9166, longitude: 79.1325, areas: []},
      { name: 'Dindigul', pincode: '624001', latitude: 10.3629, longitude: 77.9750, areas: []},
      { name: 'Thanjavur', pincode: '613001', latitude: 10.7867, longitude: 79.1378, areas: []},
      { name: 'Tuticorin', pincode: '628001', latitude: 8.7642, longitude: 78.1348, areas: []},
      { name: 'Kanchipuram', pincode: '631501', latitude: 12.8338, longitude: 79.7019, areas: []},
      { name: 'Kanyakumari', pincode: '629702', latitude: 8.0883, longitude: 77.5385, areas: []},
      { name: 'Namakkal', pincode: '637001', latitude: 11.2212, longitude: 78.1654, areas: []},
      { name: 'Karur', pincode: '639001', latitude: 10.9574, longitude: 78.0809, areas: []},
      { name: 'Pollachi', pincode: '642001', latitude: 10.6587, longitude: 77.0075, areas: []},
      { name: 'Cuddalore', pincode: '607001', latitude: 11.7447, longitude: 79.7680, areas: []},
      { name: 'Thiruvallur', pincode: '602001', latitude: 13.1442, longitude: 79.9076, areas: []},
      { name: 'Villupuram', pincode: '605601', latitude: 11.9368, longitude: 79.4927, areas: []},
    ]
  },

  // Gujarat - Districts and Important Places
  'Gujarat': {
    districts: [
      'Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Gandhinagar',
      'Junagadh', 'Anand', 'Bharuch', 'Nadiad', 'Mehsana', 'Bhuj', 'Palanpur', 'Surendranagar',
      'Amreli', 'Porbandar', 'Veraval', 'Dahod', 'Godhra', 'Navsari', 'Valsad', 'Ankleshwar',
      'Kalol', 'Modasa', 'Patan', 'Himmatnagar', 'Botad', 'Morbi'
    ],
    additionalCities: [
      { name: 'Gandhinagar', pincode: '382010', latitude: 23.2156, longitude: 72.6369, areas: [
        'Sector 1', 'Sector 10', 'Sector 16', 'Sector 21', 'Infocity'
      ]},
      { name: 'Junagadh', pincode: '362001', latitude: 21.5222, longitude: 70.4579, areas: []},
      { name: 'Anand', pincode: '388001', latitude: 22.5645, longitude: 72.9289, areas: []},
      { name: 'Bharuch', pincode: '392001', latitude: 21.7051, longitude: 72.9959, areas: []},
      { name: 'Nadiad', pincode: '387001', latitude: 22.6938, longitude: 72.8616, areas: []},
      { name: 'Mehsana', pincode: '384001', latitude: 23.5880, longitude: 72.3693, areas: []},
      { name: 'Bhuj', pincode: '370001', latitude: 23.2530, longitude: 69.6693, areas: []},
      { name: 'Palanpur', pincode: '385001', latitude: 24.1714, longitude: 72.4343, areas: []},
      { name: 'Ankleshwar', pincode: '393001', latitude: 21.6253, longitude: 73.0084, areas: []},
      { name: 'Navsari', pincode: '396445', latitude: 20.9469, longitude: 72.9280, areas: []},
      { name: 'Valsad', pincode: '396001', latitude: 20.6104, longitude: 72.9342, areas: []},
      { name: 'Godhra', pincode: '389001', latitude: 22.7755, longitude: 73.6149, areas: []},
      { name: 'Morbi', pincode: '363641', latitude: 22.8173, longitude: 70.8372, areas: []},
      { name: 'Patan', pincode: '384265', latitude: 23.8507, longitude: 72.1289, areas: []},
      { name: 'Surendranagar', pincode: '363001', latitude: 22.7272, longitude: 71.6675, areas: []},
    ]
  },

  // Rajasthan - Districts and Important Places
  'Rajasthan': {
    districts: [
      'Jaipur', 'Jodhpur', 'Kota', 'Bikaner', 'Ajmer', 'Udaipur', 'Bharatpur', 'Alwar',
      'Sikar', 'Pali', 'Tonk', 'Nagaur', 'Chittorgarh', 'Bhilwara', 'Jhunjhunu', 'Sri Ganganagar',
      'Hanumangarh', 'Churu', 'Barmer', 'Jaisalmer', 'Banswara', 'Dungarpur', 'Karauli',
      'Sawai Madhopur', 'Baran', 'Dholpur', 'Sirohi', 'Pratapgarh', 'Dausa', 'Rajsamand',
      'Bundi', 'Jhalawar', 'Barmer', 'Jalore'
    ],
    additionalCities: [
      { name: 'Kota', pincode: '324001', latitude: 25.2138, longitude: 75.8648, areas: [
        'Kunhadi', 'Talwandi', 'Mahaveer Nagar', 'Industrial Area'
      ]},
      { name: 'Bharatpur', pincode: '321001', latitude: 27.2156, longitude: 77.4928, areas: []},
      { name: 'Alwar', pincode: '301001', latitude: 27.5665, longitude: 76.6098, areas: []},
      { name: 'Sikar', pincode: '332001', latitude: 27.6145, longitude: 75.1396, areas: []},
      { name: 'Pali', pincode: '306401', latitude: 25.7713, longitude: 73.3238, areas: []},
      { name: 'Tonk', pincode: '304001', latitude: 26.1664, longitude: 75.7881, areas: []},
      { name: 'Nagaur', pincode: '341001', latitude: 27.2022, longitude: 73.7339, areas: []},
      { name: 'Chittorgarh', pincode: '312001', latitude: 24.8887, longitude: 74.6269, areas: []},
      { name: 'Bhilwara', pincode: '311001', latitude: 25.3463, longitude: 74.6368, areas: []},
      { name: 'Sri Ganganagar', pincode: '335001', latitude: 29.9038, longitude: 73.8772, areas: []},
      { name: 'Hanumangarh', pincode: '335513', latitude: 29.5816, longitude: 74.3294, areas: []},
      { name: 'Barmer', pincode: '344001', latitude: 25.7457, longitude: 71.3923, areas: []},
      { name: 'Jaisalmer', pincode: '345001', latitude: 26.9157, longitude: 70.9083, areas: []},
      { name: 'Sawai Madhopur', pincode: '322001', latitude: 26.0232, longitude: 76.3447, areas: []},
      { name: 'Bundi', pincode: '323001', latitude: 25.4413, longitude: 75.6376, areas: []},
    ]
  },

  // West Bengal - Districts and Important Places
  'West Bengal': {
    districts: [
      'Kolkata', 'Howrah', 'Hooghly', 'North 24 Parganas', 'South 24 Parganas', 'Bardhaman',
      'Nadia', 'Murshidabad', 'Birbhum', 'Purba Medinipur', 'Paschim Medinipur', 'Bankura',
      'Purulia', 'Malda', 'Uttar Dinajpur', 'Dakshin Dinajpur', 'Jalpaiguri', 'Darjeeling',
      'Cooch Behar', 'Alipurduar', 'Kalimpong'
    ],
    additionalCities: [
      { name: 'Hooghly', pincode: '712101', latitude: 22.8950, longitude: 88.4021, areas: [
        'Chinsurah', 'Serampore', 'Rishra', 'Chandannagar'
      ]},
      { name: 'Siliguri', pincode: '734001', latitude: 26.7271, longitude: 88.3953, areas: [
        'Sevoke Road', 'Hill Cart Road', 'Pradhan Nagar'
      ]},
      { name: 'Durgapur', pincode: '713201', latitude: 23.5204, longitude: 87.3119, areas: [
        'City Center', 'Benachity', 'Bidhan Nagar'
      ]},
      { name: 'Kalyani', pincode: '741235', latitude: 22.9750, longitude: 88.4344, areas: []},
      { name: 'Bardhaman', pincode: '713101', latitude: 23.2324, longitude: 87.8615, areas: []},
      { name: 'Malda', pincode: '732101', latitude: 25.0118, longitude: 88.1404, areas: []},
      { name: 'Jalpaiguri', pincode: '735101', latitude: 26.5167, longitude: 88.7333, areas: []},
      { name: 'Cooch Behar', pincode: '736101', latitude: 26.3235, longitude: 89.4454, areas: []},
      { name: 'Bankura', pincode: '722101', latitude: 23.2324, longitude: 87.0546, areas: []},
      { name: 'Purulia', pincode: '723101', latitude: 23.3306, longitude: 86.3630, areas: []},
    ]
  },

  // Telangana - Districts and Important Places
  'Telangana': {
    districts: [
      'Hyderabad', 'Rangareddy', 'Medak', 'Sangareddy', 'Nizamabad', 'Karimnagar', 'Warangal',
      'Khammam', 'Nalgonda', 'Mahabubnagar', 'Adilabad', 'Kamareddy', 'Siddipet', 'Jagtial',
      'Peddapalli', 'Jayashankar Bhupalpally', 'Mancherial', 'Komaram Bheem', 'Bhadradri Kothagudem'
    ],
    additionalCities: [
      { name: 'Sangareddy', pincode: '502001', latitude: 17.6295, longitude: 78.0937, areas: []},
      { name: 'Nizamabad', pincode: '503001', latitude: 18.6725, longitude: 78.0941, areas: []},
      { name: 'Karimnagar', pincode: '505001', latitude: 18.4386, longitude: 79.1288, areas: []},
      { name: 'Khammam', pincode: '507001', latitude: 17.2473, longitude: 80.1514, areas: []},
      { name: 'Nalgonda', pincode: '508001', latitude: 17.0536, longitude: 79.2670, areas: []},
      { name: 'Mahabubnagar', pincode: '509001', latitude: 16.7414, longitude: 77.9892, areas: []},
      { name: 'Adilabad', pincode: '504001', latitude: 19.6633, longitude: 78.5322, areas: []},
      { name: 'Kamareddy', pincode: '503111', latitude: 18.3200, longitude: 78.3419, areas: []},
      { name: 'Siddipet', pincode: '502103', latitude: 18.1048, longitude: 78.8486, areas: []},
      { name: 'Mancherial', pincode: '504208', latitude: 18.8740, longitude: 79.4280, areas: []},
    ]
  },

  // Andhra Pradesh - Districts and Important Places
  'Andhra Pradesh': {
    districts: [
      'Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool', 'Kakinada', 'Tirupati',
      'Rajahmundry', 'Ongole', 'Eluru', 'Chittoor', 'Anantapur', 'Kadapa', 'Vizianagaram',
      'Srikakulam', 'Prakasam', 'East Godavari', 'West Godavari', 'Krishna', 'Guntur',
      'Nellore', 'Chittoor', 'YSR Kadapa', 'Anantapur', 'Kurnool'
    ],
    additionalCities: [
      { name: 'Tirupati', pincode: '517501', latitude: 13.6288, longitude: 79.4192, areas: [
        'Tirumala', 'Srinivasa Mangapuram', 'Alipiri'
      ]},
      { name: 'Rajahmundry', pincode: '533101', latitude: 17.0005, longitude: 81.8040, areas: []},
      { name: 'Ongole', pincode: '523001', latitude: 15.5057, longitude: 80.0499, areas: []},
      { name: 'Eluru', pincode: '534001', latitude: 16.7050, longitude: 81.1030, areas: []},
      { name: 'Chittoor', pincode: '517001', latitude: 13.2187, longitude: 79.0965, areas: []},
      { name: 'Anantapur', pincode: '515001', latitude: 14.6819, longitude: 77.6006, areas: []},
      { name: 'Kadapa', pincode: '516001', latitude: 14.4664, longitude: 78.8236, areas: []},
      { name: 'Vizianagaram', pincode: '535001', latitude: 18.1166, longitude: 83.4115, areas: []},
      { name: 'Srikakulam', pincode: '532001', latitude: 18.2989, longitude: 83.8975, areas: []},
      { name: 'Machilipatnam', pincode: '521001', latitude: 16.1875, longitude: 81.1389, areas: []},
      { name: 'Tadepalligudem', pincode: '534101', latitude: 16.8138, longitude: 81.5272, areas: []},
    ]
  },

  // Madhya Pradesh - Districts and Important Places
  'Madhya Pradesh': {
    districts: [
      'Indore', 'Bhopal', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar', 'Rewa', 'Satna',
      'Ratlam', 'Dewas', 'Khandwa', 'Burhanpur', 'Dhar', 'Mandsaur', 'Neemuch', 'Morena',
      'Bhind', 'Guna', 'Shivpuri', 'Datia', 'Vidisha', 'Raisen', 'Hoshangabad', 'Harda',
      'Betul', 'Chhindwara', 'Seoni', 'Balaghat', 'Mandla', 'Dindori', 'Singrauli'
    ],
    additionalCities: [
      { name: 'Rewa', pincode: '486001', latitude: 24.5329, longitude: 81.2913, areas: []},
      { name: 'Satna', pincode: '485001', latitude: 24.5772, longitude: 80.8272, areas: []},
      { name: 'Ratlam', pincode: '457001', latitude: 23.3265, longitude: 75.0662, areas: []},
      { name: 'Dewas', pincode: '455001', latitude: 22.9658, longitude: 76.0553, areas: []},
      { name: 'Khandwa', pincode: '450001', latitude: 21.8247, longitude: 76.3519, areas: []},
      { name: 'Burhanpur', pincode: '450331', latitude: 21.3092, longitude: 76.2298, areas: []},
      { name: 'Dhar', pincode: '454001', latitude: 22.6014, longitude: 75.3025, areas: []},
      { name: 'Mandsaur', pincode: '458001', latitude: 24.0668, longitude: 75.0731, areas: []},
      { name: 'Morena', pincode: '476001', latitude: 26.4969, longitude: 78.0000, areas: []},
      { name: 'Guna', pincode: '473001', latitude: 24.6470, longitude: 77.3122, areas: []},
      { name: 'Shivpuri', pincode: '473551', latitude: 25.4284, longitude: 77.6623, areas: []},
      { name: 'Vidisha', pincode: '464001', latitude: 23.5268, longitude: 77.8153, areas: []},
      { name: 'Chhindwara', pincode: '480001', latitude: 22.0569, longitude: 78.9391, areas: []},
      { name: 'Singrauli', pincode: '486889', latitude: 24.1997, longitude: 82.6752, areas: []},
    ]
  },

  // Kerala - Districts and Important Places
  'Kerala': {
    districts: [
      'Thiruvananthapuram', 'Kollam', 'Pathanamthitta', 'Alappuzha', 'Kottayam', 'Idukki',
      'Ernakulam', 'Thrissur', 'Palakkad', 'Malappuram', 'Kozhikode', 'Wayanad', 'Kannur',
      'Kasaragod'
    ],
    additionalCities: [
      { name: 'Alappuzha', pincode: '688001', latitude: 9.4981, longitude: 76.3388, areas: []},
      { name: 'Kottayam', pincode: '686001', latitude: 9.5916, longitude: 76.5222, areas: []},
      { name: 'Palakkad', pincode: '678001', latitude: 10.7867, longitude: 76.6548, areas: []},
      { name: 'Malappuram', pincode: '676505', latitude: 11.0510, longitude: 76.0711, areas: []},
      { name: 'Kannur', pincode: '670001', latitude: 11.8745, longitude: 75.3704, areas: []},
      { name: 'Kasaragod', pincode: '671121', latitude: 12.4992, longitude: 74.9896, areas: []},
      { name: 'Idukki', pincode: '685501', latitude: 9.8497, longitude: 76.9726, areas: []},
      { name: 'Pathanamthitta', pincode: '689645', latitude: 9.2648, longitude: 76.7870, areas: []},
      { name: 'Wayanad', pincode: '673121', latitude: 11.6854, longitude: 76.1320, areas: []},
    ]
  },

  // Punjab - Districts and Important Places
  'Punjab': {
    districts: [
      'Amritsar', 'Ludhiana', 'Jalandhar', 'Patiala', 'Bathinda', 'Pathankot', 'Hoshiarpur',
      'Moga', 'Abohar', 'Fazilka', 'Muktsar', 'Barnala', 'Sangrur', 'Firozpur', 'Faridkot',
      'Rupnagar', 'SAS Nagar', 'Gurdaspur', 'Tarn Taran', 'Kapurthala', 'Nawanshahr'
    ],
    additionalCities: [
      { name: 'Pathankot', pincode: '145001', latitude: 32.2748, longitude: 75.6528, areas: []},
      { name: 'Hoshiarpur', pincode: '146001', latitude: 31.5320, longitude: 75.9170, areas: []},
      { name: 'Moga', pincode: '142001', latitude: 30.8167, longitude: 75.1714, areas: []},
      { name: 'Abohar', pincode: '152116', latitude: 30.1458, longitude: 74.1994, areas: []},
      { name: 'Firozpur', pincode: '152001', latitude: 30.9257, longitude: 74.6133, areas: []},
      { name: 'Sangrur', pincode: '148001', latitude: 30.2453, longitude: 75.8389, areas: []},
      { name: 'Faridkot', pincode: '151203', latitude: 30.6746, longitude: 74.7557, areas: []},
      { name: 'Gurdaspur', pincode: '143521', latitude: 32.0360, longitude: 75.4031, areas: []},
      { name: 'Kapurthala', pincode: '144601', latitude: 31.3801, longitude: 75.3757, areas: []},
    ]
  },

  // Haryana - Districts and Important Places
  'Haryana': {
    districts: [
      'Gurgaon', 'Faridabad', 'Panipat', 'Rohtak', 'Hisar', 'Karnal', 'Yamunanagar',
      'Ambala', 'Kurukshetra', 'Sonipat', 'Rewari', 'Jind', 'Fatehabad', 'Sirsa',
      'Bhiwani', 'Mahendragarh', 'Palwal', 'Mewat', 'Jhajjar', 'Kaithal', 'Panchkula'
    ],
    additionalCities: [
      { name: 'Karnal', pincode: '132001', latitude: 29.6857, longitude: 76.9905, areas: []},
      { name: 'Yamunanagar', pincode: '135001', latitude: 30.1290, longitude: 77.2674, areas: []},
      { name: 'Ambala', pincode: '134001', latitude: 30.3782, longitude: 76.7767, areas: []},
      { name: 'Kurukshetra', pincode: '136118', latitude: 29.9695, longitude: 76.8783, areas: []},
      { name: 'Sonipat', pincode: '131001', latitude: 28.9931, longitude: 77.0151, areas: []},
      { name: 'Rewari', pincode: '123401', latitude: 28.1820, longitude: 76.6180, areas: []},
      { name: 'Jind', pincode: '126102', latitude: 29.3154, longitude: 76.3156, areas: []},
      { name: 'Bhiwani', pincode: '127021', latitude: 28.7930, longitude: 76.1397, areas: []},
      { name: 'Sirsa', pincode: '125055', latitude: 29.5354, longitude: 75.0285, areas: []},
      { name: 'Palwal', pincode: '121102', latitude: 28.1446, longitude: 77.3258, areas: []},
    ]
  },

  // Bihar - Districts and Important Places
  'Bihar': {
    districts: [
      'Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Darbhanga', 'Purnia', 'Munger',
      'Bihar Sharif', 'Arrah', 'Begusarai', 'Katihar', 'Chhapra', 'Saharsa', 'Sitamarhi',
      'Samastipur', 'Motihari', 'Bettiah', 'Siwan', 'Jehanabad', 'Aurangabad', 'Nawada',
      'Jamui', 'Lakhisarai', 'Sheikhpura', 'Buxar', 'Kaimur', 'Rohtas', 'Arwal'
    ],
    additionalCities: [
      { name: 'Darbhanga', pincode: '846004', latitude: 26.1520, longitude: 85.8970, areas: []},
      { name: 'Purnia', pincode: '854301', latitude: 25.7777, longitude: 87.4750, areas: []},
      { name: 'Munger', pincode: '811201', latitude: 25.3769, longitude: 86.4747, areas: []},
      { name: 'Bihar Sharif', pincode: '803101', latitude: 25.1972, longitude: 85.5239, areas: []},
      { name: 'Arrah', pincode: '802301', latitude: 25.5547, longitude: 84.6627, areas: []},
      { name: 'Begusarai', pincode: '851101', latitude: 25.4171, longitude: 86.1286, areas: []},
      { name: 'Katihar', pincode: '854105', latitude: 25.5333, longitude: 87.5833, areas: []},
      { name: 'Chhapra', pincode: '841301', latitude: 25.7794, longitude: 84.7499, areas: []},
      { name: 'Sitamarhi', pincode: '843301', latitude: 26.5967, longitude: 85.4906, areas: []},
      { name: 'Samastipur', pincode: '848101', latitude: 25.8627, longitude: 85.7807, areas: []},
      { name: 'Motihari', pincode: '845401', latitude: 26.6487, longitude: 84.9167, areas: []},
      { name: 'Siwan', pincode: '841226', latitude: 26.2207, longitude: 84.3566, areas: []},
    ]
  },

  // Jharkhand - Districts and Important Places
  'Jharkhand': {
    districts: [
      'Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Hazaribagh', 'Deoghar', 'Giridih',
      'Dumka', 'Chaibasa', 'Gumla', 'Lohardaga', 'Simdega', 'Palamu', 'Latehar',
      'Garhwa', 'Koderma', 'Hazaribagh', 'Ramgarh', 'Chatra', 'Giridih', 'Pakur',
      'Sahebganj', 'Godda', 'Jamtara', 'Khunti', 'Saraikela-Kharsawan', 'West Singhbhum'
    ],
    additionalCities: [
      { name: 'Hazaribagh', pincode: '825301', latitude: 23.9889, longitude: 85.3597, areas: []},
      { name: 'Deoghar', pincode: '814112', latitude: 24.4829, longitude: 86.7089, areas: []},
      { name: 'Giridih', pincode: '815301', latitude: 24.1811, longitude: 86.3060, areas: []},
      { name: 'Dumka', pincode: '814101', latitude: 24.2677, longitude: 87.2449, areas: []},
      { name: 'Chaibasa', pincode: '833201', latitude: 22.5667, longitude: 85.8167, areas: []},
      { name: 'Gumla', pincode: '835207', latitude: 23.0439, longitude: 84.5396, areas: []},
      { name: 'Ramgarh', pincode: '829122', latitude: 23.6345, longitude: 85.5146, areas: []},
      { name: 'Koderma', pincode: '825409', latitude: 24.4695, longitude: 85.5929, areas: []},
      { name: 'Chatra', pincode: '825401', latitude: 24.2067, longitude: 84.8703, areas: []},
    ]
  },

  // Odisha - Districts and Important Places
  'Odisha': {
    districts: [
      'Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Sambalpur', 'Puri', 'Balasore',
      'Bhadrak', 'Baripada', 'Jharsuguda', 'Keonjhar', 'Koraput', 'Rayagada', 'Ganjam',
      'Gajapati', 'Nayagarh', 'Kendrapara', 'Jagatsinghpur', 'Puri', 'Khordha', 'Angul',
      'Dhenkanal', 'Sundergarh', 'Jajpur', 'Baleshwar', 'Mayurbhanj', 'Nuapada'
    ],
    additionalCities: [
      { name: 'Sambalpur', pincode: '768001', latitude: 21.4703, longitude: 83.9707, areas: []},
      { name: 'Puri', pincode: '752001', latitude: 19.8135, longitude: 85.8315, areas: []},
      { name: 'Balasore', pincode: '756001', latitude: 21.4944, longitude: 86.9337, areas: []},
      { name: 'Bhadrak', pincode: '756100', latitude: 21.0544, longitude: 86.5153, areas: []},
      { name: 'Baripada', pincode: '757001', latitude: 21.9354, longitude: 86.7273, areas: []},
      { name: 'Jharsuguda', pincode: '768201', latitude: 21.8556, longitude: 84.0067, areas: []},
      { name: 'Keonjhar', pincode: '758001', latitude: 21.6283, longitude: 85.5889, areas: []},
      { name: 'Koraput', pincode: '764020', latitude: 18.8097, longitude: 82.7101, areas: []},
      { name: 'Rayagada', pincode: '765001', latitude: 19.1703, longitude: 83.4152, areas: []},
      { name: 'Angul', pincode: '759122', latitude: 20.8311, longitude: 85.0963, areas: []},
    ]
  },

  // Chhattisgarh - Districts and Important Places
  'Chhattisgarh': {
    districts: [
      'Raipur', 'Bilaspur', 'Durg', 'Bhilai', 'Korba', 'Raigarh', 'Jagdalpur', 'Ambikapur',
      'Rajnandgaon', 'Dhamtari', 'Mahasamund', 'Kanker', 'Narayanpur', 'Bijapur', 'Dantewada',
      'Kondagaon', 'Bastar', 'Kabirdham', 'Mungeli', 'Gariaband', 'Surajpur', 'Balrampur'
    ],
    additionalCities: [
      { name: 'Bhilai', pincode: '490006', latitude: 21.2092, longitude: 81.4285, areas: [
        'Sector 1', 'Sector 6', 'Sector 10'
      ]},
      { name: 'Korba', pincode: '495677', latitude: 22.3511, longitude: 82.7538, areas: []},
      { name: 'Raigarh', pincode: '496001', latitude: 21.8967, longitude: 83.3961, areas: []},
      { name: 'Jagdalpur', pincode: '494001', latitude: 19.0786, longitude: 82.0379, areas: []},
      { name: 'Ambikapur', pincode: '497001', latitude: 23.1206, longitude: 83.1953, areas: []},
      { name: 'Rajnandgaon', pincode: '491441', latitude: 21.0972, longitude: 81.0319, areas: []},
      { name: 'Dhamtari', pincode: '493773', latitude: 20.7072, longitude: 81.5487, areas: []},
    ]
  },
};

// Convert districts and places data to flat array
function flattenDistrictsAndPlaces(data) {
  const locations = [];

  Object.entries(data).forEach(([state, stateData]) => {
    // Add districts as city-level entries
    if (stateData.districts) {
      stateData.districts.forEach(districtName => {
        locations.push({
          name: districtName,
          state: state,
          city: districtName,
          neighbourhood: null,
          pincode: null, // Will be updated later
          latitude: null,
          longitude: null
        });
      });
    }

    // Add additional cities with their local areas
    if (stateData.additionalCities) {
      stateData.additionalCities.forEach(cityData => {
        // Add city entry
        locations.push({
          name: cityData.name,
          state: state,
          city: cityData.name,
          neighbourhood: null,
          pincode: cityData.pincode,
          latitude: cityData.latitude,
          longitude: cityData.longitude
        });

        // Add local areas for this city
        if (cityData.areas && cityData.areas.length > 0) {
          cityData.areas.forEach(areaName => {
            locations.push({
              name: areaName,
              state: state,
              city: cityData.name,
              neighbourhood: areaName,
              pincode: cityData.pincode,
              latitude: cityData.latitude,
              longitude: cityData.longitude
            });
          });
        }
      });
    }
  });

  return locations;
}

async function seedDistrictsAndPlaces() {
  try {
    console.log('\n=== Seeding All Districts and Important Places ===\n');

    const allLocations = flattenDistrictsAndPlaces(districtsAndPlacesData);
    console.log(`Total locations to process: ${allLocations.length}`);
    console.log(`Districts/Cities: ${allLocations.filter(l => !l.neighbourhood).length}`);
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
          // Update existing location if needed
          await prisma.location.update({
            where: { slug: slug },
            data: {
              state: location.state || existing.state,
              city: location.city || existing.city,
              neighbourhood: location.neighbourhood !== null ? (location.neighbourhood || existing.neighbourhood) : null,
              pincode: location.pincode || existing.pincode,
              latitude: location.latitude || existing.latitude,
              longitude: location.longitude || existing.longitude,
              isActive: true
            }
          });
          skipped++;
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

        const locationType = location.neighbourhood ? 'Local Area' : 'City/District';
        console.log(`✅ Created: ${location.name} (${locationType})${location.neighbourhood ? ` - ${location.city}, ${location.state}` : ` - ${location.state}`}`);
        created++;
      } catch (error) {
        if (error.code === 'P2002') {
          // Unique constraint violation - skip
          skipped++;
          continue;
        }
        console.error(`❌ Error processing ${location.name}:`, error.message);
        errors++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Created: ${created}`);
    console.log(`   ⏭️  Skipped (already exists): ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📍 Total processed: ${allLocations.length}\n`);

    // Get final statistics
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

    console.log(`📍 Final Database Statistics:`);
    console.log(`   Total Locations: ${totalLocations}`);
    console.log(`   Cities/Districts: ${totalCities}`);
    console.log(`   Local Areas: ${totalAreas}`);
    console.log(`   States: ${statesCount.length}\n`);

  } catch (error) {
    console.error('❌ Error seeding districts and places:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedDistrictsAndPlaces();

