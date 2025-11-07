import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Avatar,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Warning, VolunteerActivism, CheckCircle } from '@mui/icons-material';

interface BurnoutMember {
  id: string;
  name: string;
  email: string;
  wellbeingScore: number;
  stressLevel: string;
}

export const BurnoutAlerts = () => {
  const { user } = useAuth();
  const [burnoutMembers, setBurnoutMembers] = useState<BurnoutMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [volunteeredFor, setVolunteeredFor] = useState<string[]>([]);
  const [success, setSuccess] = useState('');

  // Generate consistent dummy values (same as other components)
  const generateConsistentValue = (email: string, seed: number, min: number, max: number): number => {
    let hash = 0;
    const str = email + seed.toString();
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return min + (Math.abs(hash) % (max - min + 1));
  };

  const getConsistentStressLevel = (email: string): 'low' | 'medium' | 'high' => {
    const levels: ('low' | 'medium' | 'high')[] = ['low', 'medium', 'high'];
    const index = generateConsistentValue(email, 999, 0, 2);
    return levels[index];
  };

  useEffect(() => {
    const fetchBurnoutMembers = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const userTeamNumber = (user as any).teamNumber || '1';
        
        // Query Firestore for members in the same team
        const membersRef = collection(db, 'users');
        const q = query(
          membersRef,
          where('role', '==', 'member'),
          where('teamNumber', '==', userTeamNumber)
        );
        
        const querySnapshot = await getDocs(q);
        const members: BurnoutMember[] = [];
        
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const email = data.email || '';
          
          // Skip current user
          if (email === user.email) return;
          
          // Check if member is burnt out (wellbeing < 60 or stress = high)
          const wellbeingScore = data.analytics?.wellbeingScore ?? generateConsistentValue(email, 3, 50, 90);
          const stressLevel = data.analytics?.stressLevel ?? getConsistentStressLevel(email);
          const isExhausted = data.analytics?.isExhausted ?? (generateConsistentValue(email, 4, 0, 100) < 30);
          
          if (wellbeingScore < 60 || stressLevel === 'high' || isExhausted) {
            members.push({
              id: docSnap.id,
              name: data.name || 'Unknown',
              email: email,
              wellbeingScore: wellbeingScore,
              stressLevel: stressLevel,
            });
          }
        });
        
        setBurnoutMembers(members);
      } catch (error) {
        console.error('Error fetching burnout members:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBurnoutMembers();
  }, [user]);

  const handleVolunteer = async (member: BurnoutMember) => {
    if (!user) return;

    try {
      // Get supervisor info to send notification
      const supervisorsRef = collection(db, 'users');
      const supervisorQuery = query(
        supervisorsRef,
        where('role', '==', 'supervisor'),
        where('teamNumber', '==', (user as any).teamNumber || '1')
      );
      
      const supervisorSnapshot = await getDocs(supervisorQuery);
      
      if (!supervisorSnapshot.empty) {
        const supervisorDoc = supervisorSnapshot.docs[0];
        const supervisorId = supervisorDoc.id;
        
        // Create notification for supervisor
        await addDoc(collection(db, 'notifications'), {
          userId: supervisorId,
          message: `${user.name} has volunteered to help ${member.name} who is experiencing high stress/burnout.`,
          severity: 'info',
          timestamp: new Date().toISOString(),
          read: false,
          volunteerId: user.id,
          volunteerName: user.name,
          volunteerEmail: user.email,
          burnoutMemberId: member.id,
          burnoutMemberName: member.name,
          burnoutMemberEmail: member.email,
          type: 'volunteer_offer',
        });

        // Also create a notification for the burnt-out member
        await addDoc(collection(db, 'notifications'), {
          userId: member.id,
          message: `${user.name} has offered to help you with some tasks. Your supervisor has been notified.`,
          severity: 'success',
          timestamp: new Date().toISOString(),
          read: false,
          volunteerId: user.id,
          volunteerName: user.name,
          type: 'help_offered',
        });

        setVolunteeredFor(prev => [...prev, member.id]);
        setSuccess(`Thank you! Your supervisor has been notified that you're willing to help ${member.name}.`);
        
        setTimeout(() => setSuccess(''), 5000);
      }
    } catch (error) {
      console.error('Error volunteering:', error);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (burnoutMembers.length === 0) {
    return (
      <Card sx={{ boxShadow: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <CheckCircle sx={{ color: '#2ecc71', fontSize: 32 }} />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                All Team Members Doing Well
              </Typography>
              <Typography variant="body2" sx={{ color: '#7f8c8d' }}>
                No team members currently showing signs of burnout or high stress.
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
        Team Members Need Support
      </Typography>
      
      <Typography variant="body2" sx={{ color: '#7f8c8d', mb: 3 }}>
        The following team members are experiencing high stress or burnout. 
        You can volunteer to take on some of their tasks to help lighten their load.
      </Typography>

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {burnoutMembers.map((member) => {
          const hasVolunteered = volunteeredFor.includes(member.id);
          
          return (
            <Card 
              key={member.id} 
              sx={{ 
                boxShadow: 2,
                borderLeft: '4px solid #e74c3c',
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar
                    sx={{
                      width: 56,
                      height: 56,
                      bgcolor: '#e74c3c',
                      fontSize: 24,
                    }}
                  >
                    {member.name.charAt(0)}
                  </Avatar>

                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {member.name}
                      </Typography>
                      
                      <Chip
                        icon={<Warning sx={{ fontSize: 16 }} />}
                        label="High Stress"
                        size="small"
                        sx={{
                          bgcolor: '#e74c3c',
                          color: 'white',
                          fontWeight: 600,
                        }}
                      />

                      {member.stressLevel === 'high' && (
                        <Chip
                          label={`Stress: ${member.stressLevel.toUpperCase()}`}
                          size="small"
                          sx={{
                            bgcolor: '#f39c12',
                            color: 'white',
                            fontWeight: 600,
                          }}
                        />
                      )}
                    </Box>

                    <Typography variant="body2" sx={{ color: '#7f8c8d', mb: 1 }}>
                      {member.email}
                    </Typography>

                    <Typography variant="body2" sx={{ color: '#e74c3c', fontWeight: 600 }}>
                      Wellbeing Score: {member.wellbeingScore}/100
                      {member.wellbeingScore < 60 && ' (Critical)'}
                    </Typography>
                  </Box>

                  <Box>
                    {hasVolunteered ? (
                      <Button
                        variant="outlined"
                        disabled
                        startIcon={<CheckCircle />}
                        sx={{
                          borderColor: '#2ecc71',
                          color: '#2ecc71',
                        }}
                      >
                        Volunteered
                      </Button>
                    ) : (
                      <Button
                        variant="contained"
                        startIcon={<VolunteerActivism />}
                        onClick={() => handleVolunteer(member)}
                        sx={{
                          bgcolor: '#3498db',
                          '&:hover': {
                            bgcolor: '#2980b9',
                          },
                        }}
                      >
                        Offer to Help
                      </Button>
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Box>
    </Box>
  );
};
