import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit, Server, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Patient {
  id?: string;
  name: string;
  gender: string;
  birthDate: string;
  phone?: string;
}

interface PatientFormData {
  name: string;
  gender: string;
  birthDate: string;
  phone: string;
}

const DEFAULT_FHIR_URL = 'http://localhost:8080/fhir';
const ITEMS_PER_PAGE = 5;

export function Page1() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<PatientFormData>({
    name: '',
    gender: '',
    birthDate: '',
    phone: '',
  });
  const [formErrors, setFormErrors] = useState<Partial<PatientFormData>>({});
  const [fhirServerInput, setFhirServerInput] = useState(DEFAULT_FHIR_URL);
  const [currentFhirServer, setCurrentFhirServer] = useState(DEFAULT_FHIR_URL);
  const [currentPage, setCurrentPage] = useState(1);

  // Pagination calculations
  const totalPages = Math.ceil(filteredPatients.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentPagePatients = filteredPatients.slice(startIndex, endIndex);

  // Pagination functions
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const goToPreviousPage = () => {
    goToPage(currentPage - 1);
  };

  const goToNextPage = () => {
    goToPage(currentPage + 1);
  };

  // Calculate age from birth date
  const calculateAge = (birthDate: string): number => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  // Validate FHIR server URL
  const validateFhirUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  };

  // Handle FHIR server configuration
  const handleSetFhirServer = () => {
    const trimmedUrl = fhirServerInput.trim();
    
    if (!validateFhirUrl(trimmedUrl)) {
      alert('Invalid URL. Please enter a valid HTTP or HTTPS URL.');
      return;
    }
    
    // Clear patient list immediately when switching servers
    setPatients([]);
    setFilteredPatients([]);
    setCurrentFhirServer(trimmedUrl);
    
    // Refresh patients with new server (pass URL directly to avoid state timing issues)
    fetchPatients(trimmedUrl);
  };

  // Fetch patients from FHIR server
  const fetchPatients = async (serverUrl?: string) => {
    const fhirUrl = serverUrl || currentFhirServer;
    setLoading(true);
    console.log(`Fetching patients from: ${fhirUrl}/Patient`); // Debug log
    try {
      const response = await fetch(`${fhirUrl}/Patient`);
      if (response.ok) {
        const bundle = await response.json();
        const fhirPatients = bundle.entry?.map((entry: any) => {
          const resource = entry.resource;
          return {
            id: resource.id,
            name: resource.name?.[0]?.family ? 
              `${resource.name[0].given?.[0] || ''} ${resource.name[0].family}`.trim() : 
              resource.name?.[0]?.given?.[0] || 'Unknown',
            gender: resource.gender || 'unknown',
            birthDate: resource.birthDate || '',
            phone: resource.telecom?.find((t: any) => t.system === 'phone')?.value || '',
          };
        }) || [];
        setPatients(fhirPatients);
        setFilteredPatients(fhirPatients);
      } else {
        // Handle HTTP error responses
        alert(`Failed to connect to FHIR server at: ${fhirUrl}/Patient\n\nHTTP ${response.status}: ${response.statusText}`);
        setPatients([]);
        setFilteredPatients([]);
      }
    } catch (error) {
      // Handle network errors or invalid responses
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      let alertMessage = `Cannot connect to FHIR server at: ${fhirUrl}/Patient\n\nError: ${errorMessage}\n\n`;
      
      // Check for common CORS issues
      if (errorMessage.includes('CORS') || errorMessage.includes('Access-Control-Allow-Origin')) {
        alertMessage += 'This appears to be a CORS (Cross-Origin) policy issue. The FHIR server may not allow browser requests from this domain.';
      } else {
        alertMessage += 'Please check that the server URL is correct and the server is running.';
      }
      
      alert(alertMessage);
      setPatients([]);
      setFilteredPatients([]);
    } finally {
      setLoading(false);
    }
  };

  // Search patients
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredPatients(patients);
    } else {
      const filtered = patients.filter(patient =>
        patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (patient.phone && patient.phone.includes(searchQuery))
      );
      setFilteredPatients(filtered);
    }
    // Reset to page 1 when search changes
    setCurrentPage(1);
  }, [searchQuery, patients]);

  // Load patients on component mount
  useEffect(() => {
    fetchPatients();
  }, []);

  // Reset to valid page if current page becomes invalid
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // Form validation
  const validateForm = (): boolean => {
    const errors: Partial<PatientFormData> = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }
    
    if (!formData.gender) {
      errors.gender = 'Gender is required';
    }
    
    if (!formData.birthDate) {
      errors.birthDate = 'Birth date is required';
    } else {
      const birthDate = new Date(formData.birthDate);
      const today = new Date();
      if (birthDate > today) {
        errors.birthDate = 'Birth date cannot be in the future';
      }
    }
    
    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required';
    } else if (!/^\+?[\d\s\-\(\)]+$/.test(formData.phone.trim())) {
      errors.phone = 'Invalid phone number format';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Create FHIR Patient resource
  const createFhirPatient = (data: PatientFormData) => {
    const nameParts = data.name.trim().split(' ');
    const given = nameParts.slice(0, -1);
    const family = nameParts.slice(-1)[0];

    return {
      resourceType: 'Patient',
      name: [{
        given: given.length > 0 ? given : [data.name],
        family: family
      }],
      gender: data.gender,
      birthDate: data.birthDate,
      telecom: [{
        system: 'phone',
        value: data.phone,
        use: 'mobile'
      }]
    };
  };

  // Delete patient
  const handleDeletePatient = async (patient: Patient) => {
    if (!patient.id) {
      alert('Cannot delete patient: No patient ID found');
      return;
    }

    const confirmDelete = window.confirm(`Are you sure you want to delete patient "${patient.name}"?\n\nThis action cannot be undone.`);
    if (!confirmDelete) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${currentFhirServer}/Patient/${patient.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/fhir+json',
        },
      });

      if (response.ok || response.status === 204) {
        // 204 No Content is a valid response for DELETE
        await fetchPatients(); // Refresh the list
        alert(`Patient "${patient.name}" has been successfully deleted.`);
      } else {
        alert(`Failed to delete patient. HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Cannot connect to FHIR server: ${errorMessage}\n\nPlease check that the server is available.`);
    } finally {
      setLoading(false);
    }
  };

  // Submit patient (create or update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const fhirPatient = createFhirPatient(formData);
      
      let response;
      if (editingPatient) {
        // Update existing patient
        response = await fetch(`${currentFhirServer}/Patient/${editingPatient.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/fhir+json',
          },
          body: JSON.stringify({ ...fhirPatient, id: editingPatient.id }),
        });
      } else {
        // Create new patient
        response = await fetch(`${currentFhirServer}/Patient`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/fhir+json',
          },
          body: JSON.stringify(fhirPatient),
        });
      }

      if (response.ok) {
        await fetchPatients(); // Refresh the list
        resetForm();
        setIsDialogOpen(false);
      } else {
        alert(`Failed to save patient. HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Cannot connect to FHIR server: ${errorMessage}\n\nPlease check that the server is available.`);
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      gender: '',
      birthDate: '',
      phone: '',
    });
    setFormErrors({});
    setEditingPatient(null);
  };

  // Open edit dialog
  const handleEdit = (patient: Patient) => {
    setEditingPatient(patient);
    setFormData({
      name: patient.name,
      gender: patient.gender,
      birthDate: patient.birthDate,
      phone: patient.phone || '',
    });
    setIsDialogOpen(true);
  };

  // Open new patient dialog
  const handleNewPatient = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="space-y-6">
        {/* FHIR Server Configuration */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-end gap-4">
              <div className="flex-1 max-w-md">
                <Label htmlFor="fhir-server" className="text-sm font-medium">
                  FHIR Server
                </Label>
                <div className="relative mt-1">
                  <Server className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    id="fhir-server"
                    value={fhirServerInput}
                    onChange={(e) => setFhirServerInput(e.target.value)}
                    placeholder="http://localhost:8080/fhir"
                    className="pl-10"
                  />
                </div>
              </div>
              <Button onClick={handleSetFhirServer} variant="outline">
                Set FHIR Server
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Current server: {currentFhirServer}
            </p>
          </CardContent>
        </Card>

        {/* Header with search and new patient button */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search patients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleNewPatient} className="bg-green-600 hover:bg-green-700">
                <Plus className="w-4 h-4 mr-2" />
                New Patient
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingPatient ? 'Edit Patient' : 'New Patient'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={formErrors.name ? 'border-red-500' : ''}
                  />
                  {formErrors.name && <p className="text-sm text-red-500 mt-1">{formErrors.name}</p>}
                </div>
                
                <div>
                  <Label htmlFor="gender">Gender *</Label>
                  <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
                    <SelectTrigger className={formErrors.gender ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="unknown">Unknown</SelectItem>
                    </SelectContent>
                  </Select>
                  {formErrors.gender && <p className="text-sm text-red-500 mt-1">{formErrors.gender}</p>}
                </div>
                
                <div>
                  <Label htmlFor="birthDate">Date of Birth *</Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                    className={formErrors.birthDate ? 'border-red-500' : ''}
                  />
                  {formErrors.birthDate && <p className="text-sm text-red-500 mt-1">{formErrors.birthDate}</p>}
                </div>
                
                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                    className={formErrors.phone ? 'border-red-500' : ''}
                  />
                  {formErrors.phone && <p className="text-sm text-red-500 mt-1">{formErrors.phone}</p>}
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Saving...' : editingPatient ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Patients table */}
        <Card>
          <CardContent className="p-0">
            <Table>
                             <TableHeader>
                 <TableRow>
                   <TableHead>Name</TableHead>
                   <TableHead>Age</TableHead>
                   <TableHead>Gender</TableHead>
                   <TableHead className="w-[100px]">Actions</TableHead>
                 </TableRow>
               </TableHeader>
                             <TableBody>
                 {loading ? (
                   <TableRow>
                     <TableCell colSpan={4} className="text-center py-8">
                       Loading patients...
                     </TableCell>
                   </TableRow>
                 ) : filteredPatients.length === 0 ? (
                   <TableRow>
                     <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                       {searchQuery ? 'No patients found matching your search.' : 'No patients found.'}
                     </TableCell>
                   </TableRow>
                 ) : (
                   currentPagePatients.map((patient) => (
                     <TableRow key={patient.id}>
                       <TableCell className="font-medium">{patient.name}</TableCell>
                       <TableCell>{patient.birthDate ? calculateAge(patient.birthDate) : 'Unknown'}</TableCell>
                       <TableCell className="capitalize">{patient.gender}</TableCell>
                       <TableCell>
                         <div className="flex items-center gap-1">
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={() => handleEdit(patient)}
                             className="h-8 w-8 p-0"
                             title="Edit patient"
                           >
                             <Edit className="h-4 w-4" />
                           </Button>
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={() => handleDeletePatient(patient)}
                             className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                             title="Delete patient"
                           >
                             <Trash2 className="h-4 w-4" />
                           </Button>
                         </div>
                       </TableCell>
                     </TableRow>
                   ))
                )}
              </TableBody>
                         </Table>
           </CardContent>
         </Card>

         {/* Pagination Controls */}
         {filteredPatients.length > ITEMS_PER_PAGE && (
           <div className="flex items-center justify-between">
             <div className="text-sm text-muted-foreground">
               Showing {startIndex + 1} to {Math.min(endIndex, filteredPatients.length)} of {filteredPatients.length} patients
             </div>
             <div className="flex items-center gap-2">
               <Button
                 variant="outline"
                 size="sm"
                 onClick={goToPreviousPage}
                 disabled={currentPage === 1}
                 className="h-8 w-8 p-0"
               >
                 <ChevronLeft className="h-4 w-4" />
               </Button>
               
               <div className="flex items-center gap-1">
                 {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                   <Button
                     key={page}
                     variant={currentPage === page ? "default" : "outline"}
                     size="sm"
                     onClick={() => goToPage(page)}
                     className="h-8 w-8 p-0"
                   >
                     {page}
                   </Button>
                 ))}
               </div>
               
               <Button
                 variant="outline"
                 size="sm"
                 onClick={goToNextPage}
                 disabled={currentPage === totalPages}
                 className="h-8 w-8 p-0"
               >
                 <ChevronRight className="h-4 w-4" />
               </Button>
             </div>
           </div>
         )}
       </div>
     </div>
   );
 } 