const Medicine = require('../models/Medicine');
const MedicalRecord = require('../models/MedicalRecord');

let ai = null;
if (process.env.OPENAI_API_KEY) {
  const { OpenAI } = require('openai');
  ai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const getSafeAlternatives = async (aiClient, medicineName, allergies) => {
  if (!aiClient) return null;
  try {
    const prompt = `The patient needs an alternative to the medication "${medicineName}". They have known active allergies to: [${allergies.join(', ')}]. Suggest 2 safe alternative medications from a different drug class that serve the same medical purpose but do not cross-react with these allergens. Respond strictly in JSON format: {"recommendations": ["Alternative 1: reason...", "Alternative 2: reason..."]}`;
    
    const response = await aiClient.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    });
    
    let recs = JSON.parse(response.choices[0].message.content).recommendations;
    if (Array.isArray(recs)) {
      recs = recs.map(r => typeof r === 'string' ? r : JSON.stringify(r)).join('\n\n');
    } else if (typeof recs === 'object') {
      recs = JSON.stringify(recs);
    }
    return recs;
  } catch (err) {
    console.error("Alternative Generation Error:", err);
    return null;
  }
};

const seedMedicines = async () => {
  await Medicine.deleteMany({});
  const meds = [
    { name: 'amoxicillin', drugClass: 'penicillin', allergyCategory: 'antibiotic', composition: ['amoxicillin trihydrate'] },
    { name: 'advil', drugClass: 'nsaid', allergyCategory: 'painkiller', composition: ['ibuprofen'] },
    { name: 'tylenol', drugClass: 'analgesic', allergyCategory: 'painkiller', composition: ['acetaminophen'] },
    { name: 'bactrim', drugClass: 'sulfonamide', allergyCategory: 'antibiotic', composition: ['sulfamethoxazole', 'trimethoprim'] },
    { name: 'augmentin', drugClass: 'penicillin', allergyCategory: 'antibiotic', composition: ['amoxicillin', 'clavulanate potassium'] }
  ];
  await Medicine.insertMany(meds);
};

exports.getCheckerPage = async (req, res) => {
  const count = await Medicine.countDocuments();
  if (count === 0) {
    await seedMedicines(); 
  }
  res.render('pages/allergy-check');
};

exports.checkAllergyAPI = async (req, res) => {
  try {
    const { medicineName } = req.body;
    if (!medicineName) {
      return res.status(400).json({ status: 'Error', message: 'Medicine name is required.' });
    }

    const inputName = medicineName.toLowerCase().trim();

    const sendResponse = async (payload) => {
      if (payload.status === 'High Risk' && ai) {
         const recs = await getSafeAlternatives(ai, medicineName, patientAllergies || []);
         if (recs) payload.recommendations = recs;
      }
      return res.json(payload);
    };

    // 1. Fetch user's medical record to get allergies
    const record = await MedicalRecord.findOne({ user: req.user.id });
    if (!record) {
      return res.status(400).json({ status: 'Error', message: 'No medical profile found. Please create one first.' });
    }

    // Prepare patient allergies
    const patientAllergies = record.allergies.map(a => a.toLowerCase().trim());
    if (patientAllergies.length === 0) {
      return await sendResponse({ status: 'Safe', message: 'You have no listed allergies in your medical profile. Safe to proceed.' });
    }

    // 2. Exact Match Check (High Priority)
    const directMatch = patientAllergies.find(a => inputName.includes(a) || a.includes(inputName));
    if (directMatch) {
      return await sendResponse({ 
        status: 'High Risk', 
        message: `Direct Conflict: You are allergic to '${directMatch}'. The medicine requested is '${medicineName}'. Do not take this medication.`
      });
    }

    // 3. Gather Composition Data
    let composition = [];
    let drugClass = 'unknown';
    let category = 'unknown';
    let medName = medicineName;
    let dataSource = '';

    const medicine = await Medicine.findOne({ name: inputName });
    
    if (medicine) {
      composition = medicine.composition || [];
      drugClass = medicine.drugClass;
      category = medicine.allergyCategory;
      medName = medicine.name;
      dataSource = 'Local DB';
    } else {
      // 3b. Fallback to OpenFDA API
      try {
        const response = await fetch(`https://api.fda.gov/drug/label.json?search=openfda.brand_name:"${inputName}"+openfda.generic_name:"${inputName}"&limit=1`);
        if (response.ok) {
          const data = await response.json();
          const fdaData = data.results[0].openfda;
          if (fdaData) {
            medName = fdaData.brand_name ? fdaData.brand_name[0] : inputName;
            composition = fdaData.substance_name ? fdaData.substance_name.map(s => s.toLowerCase()) : (fdaData.generic_name ? fdaData.generic_name.map(s => s.toLowerCase()) : []);
            drugClass = fdaData.pharm_class_cs ? fdaData.pharm_class_cs.join(', ').toLowerCase() : 'unknown';
            category = fdaData.pharm_class_epc ? fdaData.pharm_class_epc.join(', ').toLowerCase() : 'unknown';
            dataSource = 'OpenFDA';
          }
        }
      } catch (err) {
        console.error("FDA API Error:", err.message);
      }
    }



    // 4. Multi-Layer Cross-Reactivity Engine
    
    // Fuzzy logic for common drug families by suffix/prefix
    const commonFamilies = {
      'cillin': 'penic', // Matches penicillin, penicilin, etc.
      'cef': 'ceph',
      'ceph': 'ceph',
      'statin': 'statin',
      'profen': 'nsaid',
      'sulfa': 'sulfa'
    };

    for (const allergy of patientAllergies) {
      // 4a. Fuzzy Suffix/Prefix matching
      for (const [marker, allergyKeyword] of Object.entries(commonFamilies)) {
        if (medName.toLowerCase().includes(marker) || composition.some(c => c.includes(marker))) {
          if (allergy.includes(allergyKeyword)) {
             return await sendResponse({
               status: 'High Risk',
               message: `Family Conflict: You are allergic to '${allergy}'. ${medName.toUpperCase()} contains the '${marker}' identifier, indicating it belongs to that drug family. Do NOT take this.`
             });
          }
        }
      }

      // Check Drug Class
      if (drugClass !== 'unknown' && drugClass !== '' && (drugClass.includes(allergy) || allergy.includes(drugClass))) {
        return await sendResponse({
          status: 'High Risk',
          message: `Class Conflict: You are allergic to '${allergy}'. ${medName.toUpperCase()} belongs to the '${drugClass}' class. Avoid taking it.`
        });
      }

      // Check Category
      if (category !== 'unknown' && category !== '' && (category.includes(allergy) || allergy.includes(category))) {
        return await sendResponse({
          status: 'High Risk',
          message: `Category Conflict: You are allergic to '${allergy}'. ${medName.toUpperCase()} acts as a '${category}'. High risk of cross-reactivity.`
        });
      }

      // Check Composition / Active Ingredients
      if (composition && composition.length > 0) {
        const ingredientMatch = composition.find(ingredient => ingredient !== '' && (ingredient.includes(allergy) || allergy.includes(ingredient)));
        if (ingredientMatch) {
           return await sendResponse({
            status: 'High Risk',
            message: `Composition Conflict: You are allergic to '${allergy}'. ${medName.toUpperCase()} contains '${ingredientMatch.toUpperCase()}' as an active ingredient. Do NOT take this.`
          });
        }
      }
    }

    // 5. Final Safety Determination
    const hasUnknowns = (drugClass === 'unknown' || category === 'unknown');
    
    // 5a. AI Tier 3 Fallback (For regional brands or missing FDA data)
    if ((!dataSource || (hasUnknowns && dataSource === 'OpenFDA')) && ai) {
      try {
        const prompt = `You are an expert clinical pharmacologist. A patient wants to take the medication "${medicineName}". Their active allergies are: [${patientAllergies.join(', ')}]. Identify the active ingredients and drug class of "${medicineName}" (including international/regional brands). Determine if there is any cross-reactivity or conflict with their allergies. Respond strictly in JSON format without any markdown tags: {"status": "Safe" | "Warning" | "High Risk", "message": "Detailed clinical explanation."}`;
        
        const aiResponse = await ai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' }
        });
        
        const aiResult = JSON.parse(aiResponse.choices[0].message.content);
        return await sendResponse({
          status: aiResult.status,
          message: `Analysis Complete (via OpenAI): ${aiResult.message}`
        });
      } catch (aiErr) {
        console.error("AI Fallback Error:", aiErr);
      }
    }

    // 5b. If we get here, either AI was not configured, or AI failed.
    if (!dataSource) {
      return await sendResponse({
        status: 'Warning',
        message: `Medicine '${medicineName}' not found in our database or FDA records, and AI analysis is unavailable. We cannot analyze its composition. Please consult a doctor manually.`
      });
    }

    if (hasUnknowns && dataSource === 'OpenFDA') {
      return await sendResponse({
        status: 'Warning',
        message: `Partial Analysis (via OpenFDA): ${medName.toUpperCase()} contains [${composition.length > 0 ? composition.join(', ').toUpperCase() : 'Unknown'}]. However, FDA records lack its exact drug class. Since you have active allergies, please consult a pharmacist to ensure no cross-reactivity.`
      });
    }

    return await sendResponse({
      status: 'Safe',
      message: `Analysis Complete (via ${dataSource}): ${medName.toUpperCase()} appears safe. Active ingredients checked: [${composition.length > 0 ? composition.join(', ').toUpperCase() : 'None listed'}].`
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'Error', message: 'Internal server error.' });
  }
};
