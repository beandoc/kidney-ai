const fs = require('fs');
const path = require('path');
const kbPath = '/Users/sachinsrivastava/Downloads/Kidney-AI/kidney-ai/knowledge_base';
const pageIndexPath = path.join(kbPath, 'pageindex');

const filesToConvert = [
    'KDIGO-2012-AKI-Guideline-English.json',
    'KDIGO-2024-ANCA-Vasculitis-Guideline-Executive-Summary.json',
    'KDIGO_2024_Lupus_Nephritis_Guideline.json'
];

for (const file of filesToConvert) {
    const filePath = path.join(kbPath, file);
    if (!fs.existsSync(filePath)) continue;

    try {
        const rawData = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(rawData);

        let simpleResult = {
            doc_name: file,
            structure: []
        };

        if (Array.isArray(data)) {
            let currentIndex = 0;
            for (const item of data) {
                if (item.content && String(item.content).trim().length > 0) {
                    simpleResult.structure.push({
                        title: item.section || (file + ' - Part ' + (currentIndex + 1)),
                        node_id: 'chunk-' + currentIndex,
                        start_index: item.page || 1,
                        end_index: item.page || 1,
                        summary: 'Segment ' + (currentIndex + 1) + ' of ' + file,
                        text: String(item.content)
                    });
                    currentIndex++;
                }
            }
            console.log('Successfully converted ' + file + ' to PageIndex format (' + simpleResult.structure.length + ' nodes).');
            const targetPath = path.join(pageIndexPath, file);
            fs.writeFileSync(targetPath, JSON.stringify(simpleResult, null, 2));
        } else {
            console.log(file + ' is not an array.');
        }

    } catch (err) {
        console.error('Error converting ' + file + ':', err.message || err);
    }
}
