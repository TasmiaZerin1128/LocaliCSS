import { useState, useEffect } from 'react';
import Papa from 'papaparse';

export default function ShowCSVData({csvString}) {
    const [data, setData] = useState([]);

    const parseCSV = (csvData: string) => {
        Papa.parse(csvData, {
            header: true,
            skipEmptyLines: true,
            complete: (result) => {
              setData(result.data);
            },
        });
    };

    useEffect(() => {
        parseCSV(csvString);
    }, [csvString]);

    if (data.length === 0) {
        return <div>Loading...</div>;
    }

    return (
        <div>
          <h1 className='text-center font-title font-bold mb-4'>RLF Summary (TP: True Positive, FP: False Positive)</h1>
          <table className='border'>
            <thead className='bg-primary text-white'>
              <tr>
                {Object.keys(data[0]).map((header) => (
                  <th key={header} className='px-4'>{header}</th>
                ))}
              </tr> 
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr key={index}>
                  {Object.values(row).map((value, index) => (
                    <td key={index} className='border border-solid py-2 px-6 text-center'>{value}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
}    