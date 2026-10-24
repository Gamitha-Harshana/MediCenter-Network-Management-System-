import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { Pill } from 'lucide-react';

export default function DoctorInventory() {
  const { data, isLoading } = useQuery({
    queryKey: ['doctor-inventory'],
    queryFn: () => api.get('/doctor/inventory').then(r => r.data),
  });

  const drugs = data?.drugs || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Drug Inventory</h1>
        <p className="text-gray-500 text-sm mt-1">Current stock available at this center</p>
      </div>

      {isLoading ? <LoadingSpinner /> : (
        <div className="card">
          {drugs.length === 0 ? (
            <div className="text-center py-12">
              <Pill size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-400">No drugs in inventory.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-gray-500 font-semibold">Drug Name</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-semibold">Type</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-semibold">Dosage Unit</th>
                    <th className="text-right py-3 px-4 text-gray-500 font-semibold">In Stock</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-semibold">Availability</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {drugs.map(drug => (
                    <tr key={drug.drug_id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-800">{drug.drug_name}</td>
                      <td className="py-3 px-4 text-gray-600">{drug.drug_type}</td>
                      <td className="py-3 px-4 text-gray-600">{drug.dosage_unit}</td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-gray-800">{drug.quantity}</td>
                      <td className="py-3 px-4">
                        {drug.quantity > 10
                          ? <span className="badge-approved">In Stock</span>
                          : drug.quantity > 0
                          ? <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-700">Low Stock</span>
                          : <span className="badge-rejected">Out of Stock</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
