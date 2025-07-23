import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  generatePKCEChallenge, 
  generateAuthUrl, 
  exchangeCodeForToken, 
  createFHIRClient,
  createManualFHIRClient,
  PKCEChallenge,
  Patient,
  MedicationRequest,
  Observation 
} from '@/lib/smart-fhir';
import { ensureCallbackServerRunning } from '@/lib/callback-server-starter';
import { UserCircle, Calendar, Activity, Pill, TestTube, Heart, LogOut } from 'lucide-react';

interface TokenData {
  access_token: string;
  patient: string;
  expires_in: number;
  token_type: string;
}

interface AppState {
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  tokenData: TokenData | null;
  patient: Patient | null;
  medications: MedicationRequest[];
  labResults: Observation[];
  vitalSigns: Observation[];
}

export function Page2() {
  const [state, setState] = useState<AppState>({
    isAuthenticated: false,
    loading: false,
    error: null,
    tokenData: null,
    patient: null,
    medications: [],
    labResults: [],
    vitalSigns: [],
  });

  const [pkceChallenge, setPkceChallenge] = useState<PKCEChallenge | null>(null);

  // Ensure callback server is running
  useEffect(() => {
    ensureCallbackServerRunning().catch(error => {
      setState(prev => ({ 
        ...prev, 
        error: `Failed to start callback server: ${error.message}` 
      }));
    });
  }, []);

  // Handle OAuth callback from popup
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data.type === 'EPIC_AUTH_SUCCESS') {
        const { code, state: returnedState } = event.data;
        
        if (!pkceChallenge || returnedState !== pkceChallenge.state) {
          setState(prev => ({ ...prev, error: 'Invalid state parameter' }));
          return;
        }

        try {
          setState(prev => ({ ...prev, loading: true, error: null }));
          
          // Exchange code for token
          const tokenData = await exchangeCodeForToken(code, pkceChallenge.codeVerifier);
          
          setState(prev => ({ 
            ...prev, 
            isAuthenticated: true, 
            tokenData,
            loading: false 
          }));

          // Set token expiration timer
          if (tokenData.expires_in) {
            setTimeout(() => {
              handleSignOut();
            }, tokenData.expires_in * 1000);
          }

        } catch (error) {
          setState(prev => ({ 
            ...prev, 
            loading: false, 
            error: `Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }));
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [pkceChallenge]);

  // Fetch patient data when authenticated
  useEffect(() => {
    if (state.isAuthenticated && state.tokenData) {
      fetchPatientData();
    }
  }, [state.isAuthenticated, state.tokenData]);

  const handleSignIn = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const challenge = await generatePKCEChallenge();
      setPkceChallenge(challenge);
      
      const authUrl = generateAuthUrl(challenge);
      
      // Open popup for authentication
      const popup = window.open(
        authUrl,
        'epic-auth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site.');
      }

      setState(prev => ({ ...prev, loading: false }));

    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: `Sign-in failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }));
    }
  };

  const handleSignOut = () => {
    setState({
      isAuthenticated: false,
      loading: false,
      error: null,
      tokenData: null,
      patient: null,
      medications: [],
      labResults: [],
      vitalSigns: [],
    });
    setPkceChallenge(null);
  };

  const fetchPatientData = async () => {
    console.log('fetchPatientData state object:', JSON.stringify(state, null, 2));
    if (!state.tokenData) return;

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      console.log('fetchPatientData state object:', JSON.stringify(state, null, 2));
      console.log('Access token:', state.tokenData.access_token ? 'Present' : 'Missing');
      console.log('Patient ID:', state.tokenData.patient);
      
      // Use manual FHIR client to ensure headers are properly sent
      const client = createManualFHIRClient(state.tokenData.access_token);
      const patientId = state.tokenData.patient;

      console.log('About to fetch patient with ID:', patientId);
      
      // Fetch patient information
      const patientResponse = await client.read({ resourceType: 'Patient', id: patientId });
      
      // Fetch medications
      console.log('Fetching medications for patient:', patientId);
      const medicationsResponse = await client.search({
        resourceType: 'MedicationRequest',
        searchParams: { patient: patientId, _sort: '-authored' }
      });

      // Fetch lab results
      console.log('Fetching lab results for patient:', patientId);
      const labResultsResponse = await client.search({
        resourceType: 'Observation',
        searchParams: { 
          patient: patientId, 
          category: 'laboratory',
          _sort: '-date'
        }
      });

      // Fetch vital signs
      console.log('Fetching vital signs for patient:', patientId);
      const vitalSignsResponse = await client.search({
        resourceType: 'Observation',
        searchParams: { 
          patient: patientId, 
          category: 'vital-signs',
          _sort: '-date'
        }
      });

      setState(prev => ({
        ...prev,
        loading: false,
        patient: patientResponse as Patient,
        medications: medicationsResponse.entry?.map((entry: any) => entry.resource) || [],
        labResults: labResultsResponse.entry?.map((entry: any) => entry.resource) || [],
        vitalSigns: vitalSignsResponse.entry?.map((entry: any) => entry.resource) || [],
      }));

    } catch (error) {
      console.log('fetchPatientData error:', error);
      console.log('Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      
      // Check if it's an authentication error
      if (error instanceof Error && error.message.includes('401')) {
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          error: 'Authentication failed. Please sign in again.' 
        }));
      } else {
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          error: `Failed to fetch patient data: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }));
      }
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString();
  };

  const getPatientName = (patient: Patient) => {
    if (!patient.name?.[0]) return 'Unknown Patient';
    const name = patient.name[0];
    const given = name.given?.join(' ') || '';
    const family = name.family || '';
    return `${given} ${family}`.trim();
  };

  const getMedicationName = (medication: MedicationRequest) => {
    return medication.medicationCodeableConcept?.text || 
           medication.medicationCodeableConcept?.coding?.[0]?.display ||
           'Unknown Medication';
  };

  const getObservationValue = (observation: Observation) => {
    if (observation.valueQuantity) {
      return `${observation.valueQuantity.value} ${observation.valueQuantity.unit || ''}`;
    }
    if (observation.valueString) {
      return observation.valueString;
    }
    if (observation.component) {
      return observation.component.map(comp => {
        const name = comp.code?.text || comp.code?.coding?.[0]?.display || '';
        const value = comp.valueQuantity ? 
          `${comp.valueQuantity.value} ${comp.valueQuantity.unit || ''}` : '';
        return `${name}: ${value}`;
      }).join(', ');
    }
    return 'No value recorded';
  };

  if (!state.isAuthenticated) {
    return (
      <div className="container mx-auto p-6">
        <div className="max-w-md mx-auto space-y-6">
          <div className="text-center">
            <UserCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-3xl font-bold mb-2">SMART FHIR Patient App</h1>
            <p className="text-muted-foreground mb-6">
              Connect to your EPIC patient portal to view your health information
            </p>
          </div>

          {state.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          <Button 
            onClick={handleSignIn} 
            disabled={state.loading}
            className="w-full"
            size="lg"
          >
            {state.loading ? 'Connecting...' : 'Sign In with EPIC'}
          </Button>

          <div className="text-xs text-muted-foreground text-center">
            This app uses SMART on FHIR to securely access your health data
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Patient Portal</h1>
          <p className="text-muted-foreground">Your health information from EPIC</p>
        </div>
        <Button variant="outline" onClick={handleSignOut}>
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>

      {state.loading && (
        <div className="text-center py-8">
          <div className="text-lg">Loading patient data...</div>
        </div>
      )}

      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      {/* Patient Information */}
      {state.patient && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserCircle className="w-5 h-5 mr-2" />
              Patient Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Name</div>
                <div className="text-lg">{getPatientName(state.patient)}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Gender</div>
                <div className="text-lg">{state.patient.gender || 'Not specified'}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Date of Birth</div>
                <div className="text-lg">{formatDate(state.patient.birthDate)}</div>
              </div>
              {state.patient.identifier?.[0] && (
                <div className="md:col-span-3">
                  <div className="text-sm font-medium text-muted-foreground">Patient ID</div>
                  <div className="text-lg">{state.patient.identifier[0].value}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Medications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Pill className="w-5 h-5 mr-2" />
            Medications ({state.medications.length})
          </CardTitle>
          <CardDescription>
            Current and past medication prescriptions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {state.medications.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medication</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Prescribed Date</TableHead>
                  <TableHead>Instructions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.medications.map((med, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {getMedicationName(med)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={med.status === 'active' ? 'default' : 'secondary'}>
                        {med.status || 'Unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(med.authoredOn)}</TableCell>
                    <TableCell>{med.dosageInstruction?.[0]?.text || 'See prescriber'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No medications found
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lab Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TestTube className="w-5 h-5 mr-2" />
            Lab Results ({state.labResults.length})
          </CardTitle>
          <CardDescription>
            Laboratory test results and findings
          </CardDescription>
        </CardHeader>
        <CardContent>
          {state.labResults.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Test</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.labResults.map((lab, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {lab.code?.text || lab.code?.coding?.[0]?.display || 'Unknown Test'}
                    </TableCell>
                    <TableCell>{getObservationValue(lab)}</TableCell>
                    <TableCell>
                      <Badge variant={lab.status === 'final' ? 'default' : 'secondary'}>
                        {lab.status || 'Unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(lab.effectiveDateTime)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No lab results found
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vital Signs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Heart className="w-5 h-5 mr-2" />
            Vital Signs ({state.vitalSigns.length})
          </CardTitle>
          <CardDescription>
            Recent vital sign measurements
          </CardDescription>
        </CardHeader>
        <CardContent>
          {state.vitalSigns.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vital Sign</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.vitalSigns.map((vital, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {vital.code?.text || vital.code?.coding?.[0]?.display || 'Unknown Vital'}
                    </TableCell>
                    <TableCell>{getObservationValue(vital)}</TableCell>
                    <TableCell>
                      <Badge variant={vital.status === 'final' ? 'default' : 'secondary'}>
                        {vital.status || 'Unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(vital.effectiveDateTime)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No vital signs found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 