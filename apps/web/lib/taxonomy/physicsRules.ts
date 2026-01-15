
export type TopicRule = {
    required: RegExp[];   // MUST contain at least one
    forbidden: RegExp[];  // MUST NOT contain any
};

export const PHYSICS_VALIDATION_RULES: Record<string, TopicRule> = {

    // ==========================================
    // CLASS 11 (INTERMEDIATE 1st YEAR)
    // ==========================================

    "Physical World": {
        required: [/physics/i, /force/i, /nature/i, /fundamental/i, /nuclear force/i, /gravitational force/i],
        forbidden: [/calculate/i, /find the value/i, /numerical/i],
    },
    "Units and Measurements": {
        required: [/dimension/i, /error/i, /significant/i, /vernier/i, /screw gauge/i, /parallax/i, /percentage error/i],
        forbidden: [/velocity/i, /acceleration/i, /projectile/i],
    },
    "Motion in a Straight Line": {
        required: [/velocity/i, /acceleration/i, /displacement/i, /speed/i, /kinematic/i, /rectilinear/i, /average speed/i],
        forbidden: [/projectile/i, /vector/i, /plane/i, /two dimension/i, /i\^/i],
    },
    "Motion in a Plane": {
        required: [/projectile/i, /vector/i, /trajectory/i, /range/i, /maximum height/i, /river/i, /rain/i, /umbrella/i, /circular motion/i],
        forbidden: [/moment of inertia/i, /torque/i],
    },
    "Laws of Motion": {
        required: [/newton/i, /force/i, /friction/i, /tension/i, /pulley/i, /impulse/i, /momentum/i, /banking/i, /free body/i],
        forbidden: [/simple harmonic/i, /shm/i, /period/i, /spring constant/i], // NO OSCILLATIONS
    },
    "Work, Energy and Power": {
        required: [/work/i, /kinetic energy/i, /potential energy/i, /power/i, /collision/i, /spring/i, /conservative/i],
        forbidden: [/temperature/i, /heat/i, /carnot/i],
    },
    "System of Particles and Rotational Motion": {
        required: [/center of mass/i, /torque/i, /moment of inertia/i, /angular momentum/i, /rolling/i, /radius of gyration/i],
        forbidden: [/fluid/i, /viscosity/i, /satellite/i],
    },
    "Oscillations": {
        required: [/simple harmonic/i, /shm/i, /amplitude/i, /period/i, /frequency/i, /pendulum/i, /restoring force/i, /damped/i],
        forbidden: [/friction.*coefficient/i, /stops after/i, /minimum force/i, /starts to move/i], // Strict + Previous Linear traps
    },
    "Gravitation": {
        required: [/satellite/i, /planet/i, /kepler/i, /escape velocity/i, /orbital/i, /gravitational potential/i, /geostationary/i],
        forbidden: [/charge/i, /electric/i, /coulomb/i, /electrostatic/i], // 12th Grade overlap
    },
    "Mechanical Properties of Solids": {
        required: [/stress/i, /strain/i, /modulus/i, /elastic/i, /young/i, /hooke/i, /bulk modulus/i],
        forbidden: [/fluid/i, /viscosity/i, /bernoulli/i],
    },
    "Mechanical Properties of Fluids": {
        required: [/pressure/i, /viscosity/i, /bernoulli/i, /pascal/i, /buoyant/i, /archimedes/i, /surface tension/i, /capillary/i],
        forbidden: [/young's modulus/i, /stress/i],
    },
    "Thermal Properties of Matter": {
        required: [/temperature/i, /heat/i, /expansion/i, /specific heat/i, /latent/i, /conductivity/i, /newton's law of cooling/i, /calorimetry/i],
        forbidden: [/carnot/i, /engine/i, /efficiency/i],
    },
    "Thermodynamics": {
        required: [/isothermal/i, /adiabatic/i, /isobaric/i, /carnot/i, /engine/i, /efficiency/i, /entropy/i, /internal energy/i, /first law/i],
        forbidden: [/current/i, /resistor/i, /capacitor/i],
    },
    "Kinetic Theory": {
        required: [/ideal gas/i, /rms/i, /mean free path/i, /degree of freedom/i, /boltzmann/i, /maxwell/i, /kinetic energy of gas/i],
        forbidden: [/liquid/i, /solid/i],
    },

    // ==========================================
    // CLASS 12 (INTERMEDIATE 2nd YEAR)
    // ==========================================

    "Waves": {
        required: [/wavelength/i, /doppler/i, /resonance/i, /beat/i, /organ pipe/i, /sound/i, /transverse/i, /longitudinal/i, /harmonic/i],
        forbidden: [/light/i, /ray/i, /mirror/i, /lens/i, /photoelectric/i], // Optics overlap
    },
    "Ray Optics and Optical Instruments": {
        required: [/mirror/i, /lens/i, /prism/i, /refraction/i, /reflection/i, /focal length/i, /telescope/i, /microscope/i, /magnification/i],
        forbidden: [/interference/i, /diffraction/i, /young's double slit/i], // Wave Optics overlap
    },
    "Wave Optics": {
        required: [/interference/i, /diffraction/i, /polarisation/i, /young/i, /slit/i, /fringe/i, /wavefront/i, /huygens/i],
        forbidden: [/lens maker/i, /mirror formula/i, /ray diagram/i],
    },
    "Electric Charges and Fields": {
        required: [/coulomb/i, /dipole/i, /flux/i, /gauss/i, /field line/i, /permittivity/i, /point charge/i],
        forbidden: [/magnetic/i, /current/i, /capacitor/i],
    },
    "Electrostatic Potential and Capacitance": {
        required: [/capacitance/i, /capacitor/i, /dielectric/i, /potential difference/i, /equipotential/i, /energy stored/i],
        forbidden: [/resistor/i, /current/i, /magnetic/i],
    },
    "Current Electricity": {
        required: [/current/i, /resistance/i, /ohm/i, /kirchhoff/i, /potentiometer/i, /wheatstone/i, /drift velocity/i, /emf/i, /internal resistance/i],
        forbidden: [/flux/i, /induction/i, /alternating/i],
    },
    "Moving Charges and Magnetism": {
        required: [/magnetic field/i, /biot-savart/i, /ampere/i, /solenoid/i, /toroid/i, /cyclotron/i, /lorentz/i, /galvanometer/i],
        forbidden: [/induction/i, /flux change/i, /faraday/i],
    },
    "Magnetism and Matter": {
        required: [/bar magnet/i, /magnetic dipole/i, /paramagnetic/i, /diamagnetic/i, /ferromagnetic/i, /hysteresis/i, /earth's magnet/i],
        forbidden: [/current carrying loop/i, /biot-savart/i],
    },
    "Electromagnetic Induction": {
        required: [/flux/i, /faraday/i, /lenz/i, /inductance/i, /inductor/i, /motional emf/i, /eddy current/i],
        forbidden: [/alternating current/i, /rms value/i, /transformer/i],
    },
    "Alternating Current": {
        required: [/rms/i, /ac voltage/i, /impedance/i, /reactance/i, /lcr/i, /resonance/i, /transformer/i, /power factor/i, /wattless/i],
        forbidden: [/dc current/i, /battery/i, /cell/i],
    },
    "Electromagnetic Waves": {
        required: [/spectrum/i, /wavelength/i, /frequency/i, /displacement current/i, /maxwell equation/i, /radio/i, /gamma/i, /x-ray/i],
        forbidden: [/sound/i, /longitudinal/i],
    },
    "Dual Nature of Radiation and Matter": {
        required: [/photoelectric/i, /work function/i, /einstein/i, /de broglie/i, /matter wave/i, /threshold frequency/i, /photon/i],
        forbidden: [/nucleus/i, /radioactive/i, /decay/i],
    },
    "Atoms": {
        required: [/bohr/i, /rutherford/i, /spectrum/i, /orbit/i, /hydrogen/i, /balmer/i, /paschen/i, /lyman/i],
        forbidden: [/nucleus/i, /fission/i, /fusion/i],
    },
    "Nuclei": {
        required: [/nucleus/i, /binding energy/i, /radioactive/i, /decay/i, /half life/i, /fission/i, /fusion/i, /mass defect/i, /isotope/i],
        forbidden: [/electron orbit/i, /bohr model/i],
    },
    "Semiconductor Electronics": {
        required: [/semiconductor/i, /diode/i, /rectifier/i, /transistor/i, /logic gate/i, /pn junction/i, /forward bias/i, /zener/i],
        forbidden: [/conductor/i, /resistance/i, /ohm's law/i],
    },
    "Communication Systems": {
        required: [/modulation/i, /bandwidth/i, /antenna/i, /signal/i, /transmission/i, /amplitude modulation/i, /frequency modulation/i],
        forbidden: [/current/i, /voltage/i],
    }
};
