package model

type GenerationRequest struct {
	Classrooms      []GeneratorClassroom      `json:"classrooms"`
	Subjects        []GeneratorSubject        `json:"subjects"`
	Groups          []GeneratorGroup          `json:"groups"`
	TeacherSubjects []GeneratorTeacherSubject `json:"teacher_subjects"`
	GroupSubjects   []GeneratorGroupSubject   `json:"group_subjects"`
}

type GeneratorClassroom struct {
	IDNumber string `json:"id_number"`
	Capacity int    `json:"capacity"`
}

type GeneratorSubject struct {
	ID                    int `json:"id"`
	WeeklyNumberOfLessons int `json:"weekly_number_of_lessons"`
}

type GeneratorGroup struct {
	ID   int `json:"id"`
	Size int `json:"size"`
}

type GeneratorTeacherSubject struct {
	TeacherID int `json:"teacher_id"`
	SubjectID int `json:"subject_id"`
}

type GeneratorGroupSubject struct {
	GroupID   int `json:"group_id"`
	SubjectID int `json:"subject_id"`
}
