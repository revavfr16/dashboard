import React, { useState } from 'react'
import { addRuntimeDispatch, clearAllRuntimeDispatches, STATION_16_UNITS } from '../utils/api'

interface TestDispatchModalProps {
  isOpen: boolean
  onClose: () => void
}

type DispatchType = 'Fire' | 'EMS'
type UnitAssignment = 'ours' | 'not_ours'
type DispatchAge = 'new' | 'old'

const TestDispatchModal: React.FC<TestDispatchModalProps> = ({ isOpen, onClose }) => {
  const [dispatchType, setDispatchType] = useState<DispatchType>('Fire')
  const [unitAssignment, setUnitAssignment] = useState<UnitAssignment>('ours')
  const [dispatchAge, setDispatchAge] = useState<DispatchAge>('new')
  const [address, setAddress] = useState('123 TEST ST')
  const [incidentDescription, setIncidentDescription] = useState('')

  const generateTestDispatch = () => {
    const now = new Date()
    const dispatchTime = dispatchAge === 'new' 
      ? new Date(now.getTime() - 5 * 1000) // 5 seconds ago
      : new Date(now.getTime() - 25 * 60 * 1000) // 25 minutes ago

    const id = Math.floor(Math.random() * 1000000) + 50000000 // Random ID starting at 50M
    const xrefId = `TEST${Date.now()}`
    const incidentNumber = `TEST-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`
    
    // Generate units based on assignment
    let unitCodes: string[]
    if (unitAssignment === 'ours') {
      unitCodes = dispatchType === 'Fire' 
        ? ['RE16', 'A16', 'CMD16', 'K16']
        : ['A16', 'M16']
    } else {
      unitCodes = dispatchType === 'Fire'
        ? ['E01', 'L01', 'A05']
        : ['A05', 'M07', 'E03']
    }

    // Generate dispatch type and description
    const fireTypes = ['STRUCTURE FIRE', 'GRASS FIRE', 'VEHICLE FIRE', 'ALARM ACTIVATION']
    const emsTypes = ['MEDICAL EMERGENCY', 'MOTOR VEHICLE ACCIDENT', 'FALL INJURY', 'CHEST PAIN']
    const typeList = dispatchType === 'Fire' ? fireTypes : emsTypes
    const selectedType = typeList[Math.floor(Math.random() * typeList.length)]
    
    const dispatch = {
      id,
      type: selectedType,
      message: incidentDescription || `Test ${dispatchType.toLowerCase()} dispatch for ${unitAssignment === 'ours' ? 'our units' : 'other units'}.`,
      place_name: null,
      address,
      address2: null,
      cross_streets: "TEST RD (0.1 miles) and DEMO AVE (0.2 miles)",
      city: "CULPEPER",
      state_code: "VA",
      latitude: 38.4707 + (Math.random() - 0.5) * 0.01,
      longitude: -78.0169 + (Math.random() - 0.5) * 0.01,
      unit_codes: unitCodes,
      incident_type_code: dispatchType === 'Fire' ? 'TEST_FIRE' : 'TEST_EMS',
      status_code: 'open' as const,
      xref_id: xrefId,
      created_at: dispatchTime.toISOString(),
      radio_channel: dispatchType === 'Fire' ? 'FIRE-TAC-1' : 'EMS-TAC-2',
      alarm_level: "1st Alarm",
      incident_number: incidentNumber,
      fire_zone: unitAssignment === 'ours' ? "Station 16 District" : "Other District",
      fire_stations: unitAssignment === 'ours' ? ["Station 16"] : ["Station 01", "Station 05"]
    }

    // Create fire incident data
    const fireIncident = {
      incident_number: xrefId,
      status_code: 'active',
      actual_incident_type: selectedType,
      aid_type: unitAssignment === 'ours' ? null : 'mutual_aid',
      alarm_at: dispatchTime.toISOString(),
      created_at: dispatchTime.toISOString(),
      updated_at: new Date(dispatchTime.getTime() + 2 * 60 * 1000).toISOString(),
      dispatch_type_code: dispatchType === 'Fire' ? 'TEST_FIRE' : 'TEST_EMS',
      dispatch_comment: `${dispatchTime.toLocaleTimeString()}: ${selectedType}\n${dispatchTime.toLocaleTimeString()}: Units notified\n${dispatchTime.toLocaleTimeString()}: Test dispatch created`,
      dispatch_notified_at: dispatchTime.toISOString(),
      alarms: '1',
      water_on_fire_at: null,
      rit_established_at: null,
      rehab_established_discontinued_at: null,
      control_utility_at: null,
      command_established_at: null,
      primary_search_complete_at: null,
      loss_stopped_at: null,
      action_takens: null,
      property_loss: null,
      contents_loss: null,
      pre_incident_property_value: null,
      pre_incident_contents_value: null,
      department_narratives: [],
      latitude: dispatch.latitude,
      longitude: dispatch.longitude,
      address: dispatch.address,
      suite: null,
      city: dispatch.city,
      state: 'VA',
      zip_code: '22701',
      first_due: unitAssignment === 'ours' ? 'Reva Volunteer Fire & Rescue  16' : 'Culpeper Fire Department',
      battalion: unitAssignment === 'ours' ? 'Reva Volunteer Fire and Rescue' : 'Culpeper Fire Department',
      response_zone: unitAssignment === 'ours' ? 'Zone 16A' : 'Zone 3B',
      apparatuses: []
    }

    // Create unit dispatch data
    const unitDispatch = {
      id,
      type: selectedType,
      status_code: 'open' as const,
      incident_type_code: dispatch.incident_type_code,
      unit_codes: unitCodes,
      created_at: dispatchTime.toISOString(),
      place_name: null,
      address: dispatch.address,
      address2: null,
      city: dispatch.city,
      state_code: dispatch.state_code,
      location: `${dispatch.address}, ${dispatch.city}, ${dispatch.state_code}, 22701`,
      latitude: dispatch.latitude,
      longitude: dispatch.longitude,
      message: dispatch.message,
      call_notes: `${dispatchTime.toLocaleTimeString()}: ${selectedType}\n${dispatchTime.toLocaleTimeString()}: Units notified`,
      units: [
        {
          id: Math.floor(Math.random() * 1000) + 900000,
          name: "Test Responder",
          email: "test@example.org",
          statuses: [
            {
              name: "Notified",
              status_code: "notified",
              created_at: dispatchTime.toISOString()
            }
          ]
        }
      ]
    }

    // Add to runtime storage
    addRuntimeDispatch(dispatch, fireIncident, unitDispatch)
    
    // Close modal
    onClose()
    
    console.log(`Created test ${dispatchType} dispatch:`, {
      type: selectedType,
      units: unitAssignment,
      age: dispatchAge,
      id: dispatch.id
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose}></div>
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
          {/* Header */}
          <div className="sm:flex sm:items-start">
            <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20 sm:mx-0 sm:h-10 sm:w-10">
              <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m-4.5 0c-.251.023-.501.05-.75.082m.75-.082V3.104z" />
              </svg>
            </div>
            <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left flex-1">
              <h3 className="text-base font-semibold leading-6 text-gray-900 dark:text-white">
                Create Test Dispatch
              </h3>
              <div className="mt-4 space-y-4">
                {/* Dispatch Type */}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
                  <div className="mt-1 flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="Fire"
                        checked={dispatchType === 'Fire'}
                        onChange={(e) => setDispatchType(e.target.value as DispatchType)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Fire</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="EMS"
                        checked={dispatchType === 'EMS'}
                        onChange={(e) => setDispatchType(e.target.value as DispatchType)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">EMS</span>
                    </label>
                  </div>
                </div>

                {/* Unit Assignment */}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Units</label>
                  <div className="mt-1 flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="ours"
                        checked={unitAssignment === 'ours'}
                        onChange={(e) => setUnitAssignment(e.target.value as UnitAssignment)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Our Units</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="not_ours"
                        checked={unitAssignment === 'not_ours'}
                        onChange={(e) => setUnitAssignment(e.target.value as UnitAssignment)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Other Units</span>
                    </label>
                  </div>
                </div>

                {/* Dispatch Age */}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Age</label>
                  <div className="mt-1 flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="new"
                        checked={dispatchAge === 'new'}
                        onChange={(e) => setDispatchAge(e.target.value as DispatchAge)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">New (5s ago)</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="old"
                        checked={dispatchAge === 'old'}
                        onChange={(e) => setDispatchAge(e.target.value as DispatchAge)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Old (25m ago)</span>
                    </label>
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm"
                    placeholder="123 TEST ST"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Description (optional)</label>
                  <textarea
                    value={incidentDescription}
                    onChange={(e) => setIncidentDescription(e.target.value)}
                    rows={2}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm"
                    placeholder="Custom incident description..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              className="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 sm:ml-3 sm:w-auto"
              onClick={generateTestDispatch}
            >
              Create Dispatch
            </button>
            <button
              type="button"
              className="mt-3 inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:mt-0 sm:w-auto sm:mr-3"
              onClick={() => {
                clearAllRuntimeDispatches()
                onClose()
              }}
            >
              Clear All
            </button>
            <button
              type="button"
              className="mt-3 inline-flex w-full justify-center rounded-md bg-white dark:bg-gray-700 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 sm:mt-0 sm:w-auto"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TestDispatchModal