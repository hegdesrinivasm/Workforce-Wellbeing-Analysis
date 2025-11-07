import { useEffect } from 'react';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';

/**
 * This component runs in the background to automatically create burnout notifications
 * for team members when someone in their team is experiencing burnout.
 * 
 * ELIGIBILITY CRITERIA:
 * - Only sends notifications to members who are NOT burnt out themselves
 * - Only sends to members with task completion rate > 75%
 * - This ensures only capable, available members are asked to help
 * 
 * It only shows in notifications - no UI component.
 */
export const BurnoutNotificationService = () => {
  const { user } = useAuth();

  // Generate consistent dummy values
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
    const checkForBurnoutAndNotify = async () => {
      if (!user || user.role !== 'member') return;

      try {
        const userTeamNumber = (user as any).teamNumber || '1';
        
        // Check if we already sent notifications today (to avoid spam)
        const today = new Date().toISOString().split('T')[0];
        const notificationCheckKey = `burnout_check_${user.id}_${today}`;
        
        if (localStorage.getItem(notificationCheckKey)) {
          return; // Already checked today
        }

        // First, check if current user is eligible to receive burnout alerts
        // Only send to users who are NOT burnt out and have high task completion (>75%)
        const currentUserEmail = user.email || '';
        const currentUserWellbeing = (user as any).analytics?.wellbeingScore ?? generateConsistentValue(currentUserEmail, 3, 50, 90);
        const currentUserStress = (user as any).analytics?.stressLevel ?? getConsistentStressLevel(currentUserEmail);
        const currentUserExhausted = (user as any).analytics?.isExhausted ?? (generateConsistentValue(currentUserEmail, 4, 0, 100) < 30);
        const currentUserTaskCompletion = (user as any).analytics?.taskCompletionRate ?? generateConsistentValue(currentUserEmail, 1, 60, 100);
        
        // Check if current user is eligible (not burnt out AND high task completion)
        const isCurrentUserBurntOut = currentUserWellbeing < 60 || currentUserStress === 'high' || currentUserExhausted;
        const hasHighTaskCompletion = currentUserTaskCompletion > 75;
        
        if (isCurrentUserBurntOut || !hasHighTaskCompletion) {
          // Current user is not eligible to receive burnout alerts
          localStorage.setItem(notificationCheckKey, 'true');
          return;
        }

        // Query Firestore for members in the same team
        const membersRef = collection(db, 'users');
        const q = query(
          membersRef,
          where('role', '==', 'member'),
          where('teamNumber', '==', userTeamNumber)
        );
        
        const querySnapshot = await getDocs(q);
        
        for (const docSnap of querySnapshot.docs) {
          const data = docSnap.data();
          const email = data.email || '';
          
          // Skip current user
          if (email === user.email) continue;
          
          // Check if member is burnt out
          const wellbeingScore = data.analytics?.wellbeingScore ?? generateConsistentValue(email, 3, 50, 90);
          const stressLevel = data.analytics?.stressLevel ?? getConsistentStressLevel(email);
          const isExhausted = data.analytics?.isExhausted ?? (generateConsistentValue(email, 4, 0, 100) < 30);
          
          if (wellbeingScore < 60 || stressLevel === 'high' || isExhausted) {
            // Check if notification already exists for this user about this burnout member
            const existingNotificationsRef = collection(db, 'notifications');
            const existingQuery = query(
              existingNotificationsRef,
              where('userId', '==', user.id),
              where('burnoutMemberId', '==', docSnap.id),
              where('type', '==', 'burnout_alert')
            );
            
            const existingSnapshot = await getDocs(existingQuery);
            
            if (existingSnapshot.empty) {
              // Create notification about burnt out team member (only for eligible helpers)
              await addDoc(collection(db, 'notifications'), {
                userId: user.id,
                message: `${data.name} is experiencing high stress/burnout. Would you like to volunteer to help by taking on some of their tasks?`,
                severity: 'warning',
                timestamp: new Date().toISOString(),
                read: false,
                burnoutMemberId: docSnap.id,
                burnoutMemberName: data.name,
                burnoutMemberEmail: email,
                burnoutMemberWellbeing: wellbeingScore,
                type: 'burnout_alert',
                actionable: true,
              });
            }
          }
        }
        
        // Mark that we checked today
        localStorage.setItem(notificationCheckKey, 'true');
      } catch (error) {
        console.error('Error checking for burnout:', error);
      }
    };

    // Run check on component mount
    checkForBurnoutAndNotify();
  }, [user]);

  return null; // No UI
};
