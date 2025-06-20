import React, { useState, useEffect } from 'react';
import { Calculator, Zap, Thermometer, Settings, Info, Edit3, RotateCcw } from 'lucide-react';

interface MaterialProperties {
  name: string;
  bandgap: number; // eV at 300K
  Nc300: number; // cm^-3 at 300K
  Nv300: number; // cm^-3 at 300K
  temperatureCoeff: number; // eV/K for bandgap
}

const defaultMaterials: MaterialProperties[] = [
  {
    name: 'Silicon',
    bandgap: 1.12,
    Nc300: 2.8e19,
    Nv300: 1.04e19,
    temperatureCoeff: -2.73e-4
  },
  {
    name: 'Germanium',
    bandgap: 0.66,
    Nc300: 1.04e19,
    Nv300: 6.0e18,
    temperatureCoeff: -3.9e-4
  },
  {
    name: 'GaAs',
    bandgap: 1.42,
    Nc300: 4.7e17,
    Nv300: 7.0e18,
    temperatureCoeff: -5.4e-4
  }
];

function App() {
  const [materials, setMaterials] = useState<MaterialProperties[]>(defaultMaterials);
  const [selectedMaterial, setSelectedMaterial] = useState(0);
  const [temperature, setTemperature] = useState(300);
  const [donorConc, setDonorConc] = useState(1e16);
  const [acceptorConc, setAcceptorConc] = useState(0);
  const [kB, setKB] = useState(8.617e-5); // Boltzmann constant in eV/K
  const [showConstantsEditor, setShowConstantsEditor] = useState(false);
  
  const [results, setResults] = useState({
    ni: 0,
    n: 0,
    p: 0,
    fermiLevel: 0,
    conductionType: ''
  });

  const defaultKB = 8.617e-5; // Default Boltzmann constant

  useEffect(() => {
    calculateConcentrations();
  }, [selectedMaterial, temperature, donorConc, acceptorConc, kB, materials]);

  const calculateConcentrations = () => {
    const material = materials[selectedMaterial];
    
    // Temperature-dependent bandgap
    const Eg = material.bandgap + material.temperatureCoeff * (temperature - 300);
    
    // Temperature-dependent effective density of states
    const tempRatio = temperature / 300;
    const Nc = material.Nc300 * Math.pow(tempRatio, 1.5);
    const Nv = material.Nv300 * Math.pow(tempRatio, 1.5);
    
    // Intrinsic carrier concentration
    const ni = Math.sqrt(Nc * Nv) * Math.exp(-Eg / (2 * kB * temperature));
    
    // Net doping
    const netDoping = donorConc - acceptorConc;
    
    let n, p, fermiLevel;
    let conductionType;
    
    if (Math.abs(netDoping) < ni) {
      // Intrinsic semiconductor
      n = ni;
      p = ni;
      fermiLevel = 0; // Relative to intrinsic Fermi level
      conductionType = 'Intrinsic';
    } else if (netDoping > 0) {
      // n-type semiconductor
      if (netDoping >> ni) {
        n = netDoping;
        p = ni * ni / n;
      } else {
        // Solve quadratic equation for exact solution
        const discriminant = Math.sqrt(netDoping * netDoping + 4 * ni * ni);
        n = (netDoping + discriminant) / 2;
        p = ni * ni / n;
      }
      fermiLevel = kB * temperature * Math.log(n / ni);
      conductionType = 'n-type';
    } else {
      // p-type semiconductor
      const netAcceptor = Math.abs(netDoping);
      if (netAcceptor >> ni) {
        p = netAcceptor;
        n = ni * ni / p;
      } else {
        // Solve quadratic equation for exact solution
        const discriminant = Math.sqrt(netAcceptor * netAcceptor + 4 * ni * ni);
        p = (netAcceptor + discriminant) / 2;
        n = ni * ni / p;
      }
      fermiLevel = -kB * temperature * Math.log(p / ni);
      conductionType = 'p-type';
    }
    
    setResults({
      ni,
      n,
      p,
      fermiLevel,
      conductionType
    });
  };

  const formatScientific = (value: number): string => {
    if (value === 0) return '0';
    const exponent = Math.floor(Math.log10(Math.abs(value)));
    const coefficient = value / Math.pow(10, exponent);
    return `${coefficient.toFixed(2)} × 10^${exponent}`;
  };

  const formatEnergy = (value: number): string => {
    return `${(value * 1000).toFixed(1)} meV`;
  };

  const updateMaterialProperty = (index: number, property: keyof MaterialProperties, value: number) => {
    const newMaterials = [...materials];
    newMaterials[index] = { ...newMaterials[index], [property]: value };
    setMaterials(newMaterials);
  };

  const resetToDefaults = () => {
    setMaterials(defaultMaterials);
    setKB(defaultKB);
  };

  const isModified = () => {
    return kB !== defaultKB || JSON.stringify(materials) !== JSON.stringify(defaultMaterials);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl">
              <Calculator className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Semiconductor Physics Calculator
            </h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Calculate electron and hole concentrations in semiconductors with temperature-dependent parameters
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input Panel */}
          <div className="space-y-6">
            {/* Physical Constants */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Edit3 className="w-5 h-5 text-purple-600" />
                  <h2 className="text-xl font-semibold text-gray-800">Physical Constants</h2>
                  {isModified() && (
                    <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">Modified</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowConstantsEditor(!showConstantsEditor)}
                    className="px-3 py-1 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    {showConstantsEditor ? 'Hide' : 'Edit'}
                  </button>
                  {isModified() && (
                    <button
                      onClick={resetToDefaults}
                      className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reset
                    </button>
                  )}
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                  <div>
                    <span className="font-medium text-purple-800">Boltzmann Constant (kB)</span>
                    <p className="text-sm text-purple-600">Used in ni calculation and Fermi level</p>
                  </div>
                  <div className="text-right">
                    {showConstantsEditor ? (
                      <input
                        type="number"
                        value={kB}
                        onChange={(e) => setKB(Number(e.target.value))}
                        className="w-32 px-2 py-1 border border-purple-300 rounded text-sm"
                        step="1e-6"
                      />
                    ) : (
                      <span className="font-mono text-purple-900">{kB.toExponential(3)}</span>
                    )}
                    <p className="text-xs text-purple-600">eV/K</p>
                  </div>
                </div>

                {showConstantsEditor && (
                  <div className="border-t pt-4">
                    <h3 className="font-medium text-gray-800 mb-3">Material Properties Editor</h3>
                    <div className="space-y-4">
                      {materials.map((material, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <h4 className="font-medium text-gray-700 mb-3">{material.name}</h4>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <label className="block text-gray-600 mb-1">Bandgap (eV)</label>
                              <input
                                type="number"
                                value={material.bandgap}
                                onChange={(e) => updateMaterialProperty(index, 'bandgap', Number(e.target.value))}
                                className="w-full px-2 py-1 border border-gray-300 rounded"
                                step="0.01"
                              />
                            </div>
                            <div>
                              <label className="block text-gray-600 mb-1">Temp Coeff (eV/K)</label>
                              <input
                                type="number"
                                value={material.temperatureCoeff}
                                onChange={(e) => updateMaterialProperty(index, 'temperatureCoeff', Number(e.target.value))}
                                className="w-full px-2 py-1 border border-gray-300 rounded"
                                step="1e-5"
                              />
                            </div>
                            <div>
                              <label className="block text-gray-600 mb-1">Nc (300K) cm⁻³</label>
                              <input
                                type="number"
                                value={material.Nc300}
                                onChange={(e) => updateMaterialProperty(index, 'Nc300', Number(e.target.value))}
                                className="w-full px-2 py-1 border border-gray-300 rounded"
                                step="1e17"
                              />
                            </div>
                            <div>
                              <label className="block text-gray-600 mb-1">Nv (300K) cm⁻³</label>
                              <input
                                type="number"
                                value={material.Nv300}
                                onChange={(e) => updateMaterialProperty(index, 'Nv300', Number(e.target.value))}
                                className="w-full px-2 py-1 border border-gray-300 rounded"
                                step="1e17"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Material Selection */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center gap-3 mb-4">
                <Settings className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-800">Material Properties</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Semiconductor Material</label>
                  <select
                    value={selectedMaterial}
                    onChange={(e) => setSelectedMaterial(Number(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    {materials.map((material, index) => (
                      <option key={index} value={index}>{material.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <span className="font-medium">Bandgap (300K):</span>
                    <p>{materials[selectedMaterial].bandgap} eV</p>
                  </div>
                  <div>
                    <span className="font-medium">Nc (300K):</span>
                    <p>{formatScientific(materials[selectedMaterial].Nc300)} cm⁻³</p>
                  </div>
                  <div>
                    <span className="font-medium">Nv (300K):</span>
                    <p>{formatScientific(materials[selectedMaterial].Nv300)} cm⁻³</p>
                  </div>
                  <div>
                    <span className="font-medium">Temp Coeff:</span>
                    <p>{materials[selectedMaterial].temperatureCoeff.toExponential(2)} eV/K</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Operating Conditions */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center gap-3 mb-4">
                <Thermometer className="w-5 h-5 text-orange-600" />
                <h2 className="text-xl font-semibold text-gray-800">Operating Conditions</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Temperature: {temperature} K ({(temperature - 273.15).toFixed(1)} °C)
                  </label>
                  <input
                    type="range"
                    min="200"
                    max="500"
                    value={temperature}
                    onChange={(e) => setTemperature(Number(e.target.value))}
                    className="w-full h-2 bg-gradient-to-r from-blue-200 to-red-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>200K</span>
                    <span>350K</span>
                    <span>500K</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Doping Concentrations */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center gap-3 mb-4">
                <Zap className="w-5 h-5 text-green-600" />
                <h2 className="text-xl font-semibold text-gray-800">Doping Concentrations</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Donor Concentration (ND) [cm⁻³]
                  </label>
                  <input
                    type="number"
                    value={donorConc}
                    onChange={(e) => setDonorConc(Number(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    step="1e14"
                    min="0"
                    placeholder="e.g., 1e16"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Acceptor Concentration (NA) [cm⁻³]
                  </label>
                  <input
                    type="number"
                    value={acceptorConc}
                    onChange={(e) => setAcceptorConc(Number(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    step="1e14"
                    min="0"
                    placeholder="e.g., 0"
                  />
                </div>
                
                <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                  <p><strong>Net Doping:</strong> {formatScientific(donorConc - acceptorConc)} cm⁻³</p>
                </div>
              </div>
            </div>
          </div>

          {/* Results Panel */}
          <div className="space-y-6">
            {/* Calculation Details */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Calculation Details</h2>
              
              <div className="space-y-3 text-sm">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h3 className="font-medium text-gray-800 mb-2">Current Values Used:</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>kB = {kB.toExponential(3)} eV/K</div>
                    <div>Eg(T) = {(materials[selectedMaterial].bandgap + materials[selectedMaterial].temperatureCoeff * (temperature - 300)).toFixed(3)} eV</div>
                    <div>T = {temperature} K</div>
                    <div>Material: {materials[selectedMaterial].name}</div>
                  </div>
                </div>
                
                <div className="bg-blue-50 p-3 rounded-lg">
                  <h3 className="font-medium text-blue-800 mb-1">Intrinsic Concentration Formula:</h3>
                  <p className="font-mono text-xs text-blue-700">ni = √(Nc × Nv) × exp(-Eg/(2kBT))</p>
                </div>
              </div>
            </div>

            {/* Carrier Concentrations */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-lg ${
                  results.conductionType === 'n-type' ? 'bg-blue-100' :
                  results.conductionType === 'p-type' ? 'bg-red-100' : 'bg-gray-100'
                }`}>
                  <Info className={`w-5 h-5 ${
                    results.conductionType === 'n-type' ? 'text-blue-600' :
                    results.conductionType === 'p-type' ? 'text-red-600' : 'text-gray-600'
                  }`} />
                </div>
                <h2 className="text-xl font-semibold text-gray-800">Results</h2>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  results.conductionType === 'n-type' ? 'bg-blue-100 text-blue-800' :
                  results.conductionType === 'p-type' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {results.conductionType}
                </span>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-blue-800 mb-1">Intrinsic Carrier Concentration</h3>
                  <p className="text-lg font-bold text-blue-900">ni = {formatScientific(results.ni)} cm⁻³</p>
                </div>
                
                <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-green-800 mb-1">Electron Concentration</h3>
                  <p className="text-lg font-bold text-green-900">n = {formatScientific(results.n)} cm⁻³</p>
                </div>
                
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-purple-800 mb-1">Hole Concentration</h3>
                  <p className="text-lg font-bold text-purple-900">p = {formatScientific(results.p)} cm⁻³</p>
                </div>
                
                <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-orange-800 mb-1">Fermi Level (relative to Ei)</h3>
                  <p className="text-lg font-bold text-orange-900">EF - Ei = {formatEnergy(results.fermiLevel)}</p>
                </div>
              </div>
            </div>

            {/* Physical Insights */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Physical Insights</h2>
              
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Mass Action Law:</span>
                  <span className="font-mono">n × p = {formatScientific(results.n * results.p)} cm⁻⁶</span>
                </div>
                <div className="flex justify-between">
                  <span>ni² =</span>
                  <span className="font-mono">{formatScientific(results.ni ** 2)} cm⁻⁶</span>
                </div>
                <div className="flex justify-between">
                  <span>Majority Carrier:</span>
                  <span className="font-medium">
                    {results.n > results.p ? 'Electrons' : 'Holes'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Carrier Ratio (n/p):</span>
                  <span className="font-mono">{(results.n / results.p).toExponential(2)}</span>
                </div>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Presets</h2>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setDonorConc(0);
                    setAcceptorConc(0);
                  }}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                >
                  Intrinsic
                </button>
                <button
                  onClick={() => {
                    setDonorConc(1e16);
                    setAcceptorConc(0);
                  }}
                  className="px-4 py-2 bg-blue-100 hover:bg-blue-200 rounded-lg text-sm font-medium transition-colors"
                >
                  n-type (1e16)
                </button>
                <button
                  onClick={() => {
                    setDonorConc(0);
                    setAcceptorConc(1e16);
                  }}
                  className="px-4 py-2 bg-red-100 hover:bg-red-200 rounded-lg text-sm font-medium transition-colors"
                >
                  p-type (1e16)
                </button>
                <button
                  onClick={() => {
                    setDonorConc(1e18);
                    setAcceptorConc(0);
                  }}
                  className="px-4 py-2 bg-green-100 hover:bg-green-200 rounded-lg text-sm font-medium transition-colors"
                >
                  Heavy n-type
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;